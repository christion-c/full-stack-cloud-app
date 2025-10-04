import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Config
const cfg = new pulumi.Config();
const region = aws.config.region!;
const dbName = cfg.get("dbName") ?? "appdb";
const dbUser = cfg.get("dbUser") ?? "appuser";
const dbPass = cfg.requireSecret("dbPassword");
const enableCloudFront = cfg.getBoolean("enableCloudFront") ?? false;

// VPC with public (EC2) + private (RDS)
const vpc = new awsx.ec2.Vpc("app-vpc", {
  numberOfAvailabilityZones: 2,
  natGateways: { strategy: "None" },
  subnets: [{ type: "public", name: "public" }, { type: "private", name: "private-db" }],
});

// S3 static site for frontend
const bucket = new aws.s3.Bucket("frontend-bucket", {
  website: { indexDocument: "index.html", errorDocument: "index.html" },
  corsRules: [{ allowedMethods: ["GET","HEAD"], allowedOrigins: ["*"], allowedHeaders: ["*"], maxAgeSeconds: 300 }],
});
new aws.s3.BucketPolicy("frontend-policy", {
  bucket: bucket.bucket,
  policy: bucket.bucket.apply(name => JSON.stringify({
    Version: "2012-10-17",
    Statement: [{ Sid:"PublicRead", Effect:"Allow", Principal:"*", Action:["s3:GetObject"], Resource:[`arn:aws:s3:::${name}/*`] }]
  })),
});

let cfDomain: pulumi.Output<string> | undefined;
if (enableCloudFront) {
  const dist = new aws.cloudfront.Distribution("frontend-cf", {
    enabled: true,
    origins: [{
      originId: "s3site",
      domainName: bucket.websiteEndpoint,
      customOriginConfig: { originProtocolPolicy: "http-only", httpPort: 80, httpsPort: 443, originSslProtocols: ["TLSv1.2"] }
    }],
    defaultCacheBehavior: {
      targetOriginId: "s3site",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET","HEAD"], cachedMethods: ["GET","HEAD"],
      forwardedValues: { cookies: { forward: "none" }, queryString: false },
    },
    defaultRootObject: "index.html",
    priceClass: "PriceClass_100",
  });
  cfDomain = dist.domainName;
}

// RDS Postgres (private)
const dbSg = new aws.ec2.SecurityGroup("db-sg", { vpcId: vpc.vpcId, egress: [{ protocol:"-1", fromPort:0, toPort:0, cidrBlocks:["0.0.0.0/0"] }] });
const dbSubnetGroup = new aws.rds.SubnetGroup("db-subnet-group", { subnetIds: vpc.privateSubnetIds });
const rds = new aws.rds.Instance("postgres", {
  engine: "postgres", engineVersion: "16.3", instanceClass: "db.t3.micro",
  allocatedStorage: 20, dbName, username: dbUser, password: dbPass,
  dbSubnetGroupName: dbSubnetGroup.name, vpcSecurityGroupIds: [dbSg.id],
  publiclyAccessible: false, skipFinalSnapshot: true,
});

// Store DB params in SSM
const ssmUser = new aws.ssm.Parameter("db-user", { type:"SecureString", name:"/app/db/user", value: dbUser });
const ssmName = new aws.ssm.Parameter("db-name", { type:"SecureString", name:"/app/db/name", value: dbName });
const ssmPass = new aws.ssm.Parameter("db-pass", { type:"SecureString", name:"/app/db/pass", value: dbPass });
const ssmHost = new aws.ssm.Parameter("db-host", { type:"SecureString", name:"/app/db/host", value: rds.address });
const ssmPort = new aws.ssm.Parameter("db-port", { type:"SecureString", name:"/app/db/port", value: "5432" });

// EC2 role with SSM
const role = new aws.iam.Role("ec2-ssm-role", { assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }) });
new aws.iam.RolePolicyAttachment("ssm-core", { role: role.name, policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" });
new aws.iam.RolePolicyAttachment("ssm-param", { role: role.name, policyArn: "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess" });
const profile = new aws.iam.InstanceProfile("ec2-profile", { role });

// API SG (public 3001 + locked SSH)
const apiSg = new aws.ec2.SecurityGroup("api-sg", {
  vpcId: vpc.vpcId,
  ingress: [
    { protocol:"tcp", fromPort:22, toPort:22, cidrBlocks:["YOUR_IP/32"] },
    { protocol:"tcp", fromPort:3001, toPort:3001, cidrBlocks:["0.0.0.0/0"] },
  ],
  egress: [{ protocol:"-1", fromPort:0, toPort:0, cidrBlocks:["0.0.0.0/0"] }],
});

// Allow API → DB only
new aws.ec2.SecurityGroupRule("db-from-api", {
  securityGroupId: dbSg.id, type:"ingress", protocol:"tcp", fromPort:5432, toPort:5432, sourceSecurityGroupId: apiSg.id,
});

// EC2 (Amazon Linux 2023)
const ami = aws.getAmiOutput({
  owners: ["137112412989"], filters: [{ name:"name", values:["al2023-ami-*-x86_64"] }],
  mostRecent: true,
});
const userData = `#!/bin/bash
set -eux
dnf install -y docker
systemctl enable --now docker
curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
mkdir -p /opt/app
cat > /opt/app/fetch_env.sh <<'EOF'
#!/bin/bash
export AWS_REGION=${region}
DB_USER=$(aws ssm get-parameter --with-decryption --name /app/db/user --query Parameter.Value --output text --region $AWS_REGION)
DB_NAME=$(aws ssm get-parameter --with-decryption --name /app/db/name --query Parameter.Value --output text --region $AWS_REGION)
DB_PASSWORD=$(aws ssm get-parameter --with-decryption --name /app/db/pass --query Parameter.Value --output text --region $AWS_REGION)
DB_HOST=$(aws ssm get-parameter --with-decryption --name /app/db/host --query Parameter.Value --output text --region $AWS_REGION)
DB_PORT=$(aws ssm get-parameter --with-decryption --name /app/db/port --query Parameter.Value --output text --region $AWS_REGION)
cat > /opt/app/.env <<EOV
DB_USER=$DB_USER
DB_NAME=$DB_NAME
DB_PASSWORD=$DB_PASSWORD
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
PORT=3001
EOV
EOF
chmod +x /opt/app/fetch_env.sh
`;

const api = new aws.ec2.Instance("api-ec2", {
  ami: ami.id, instanceType: "t3.micro",
  subnetId: vpc.publicSubnetIds[0],
  vpcSecurityGroupIds: [apiSg.id],
  iamInstanceProfile: profile.name,
  userData,
  keyName: "your-keypair-name", // or use SSM Session Manager instead of SSH
  tags: { Name: "api-ec2" },
});

// CloudWatch basic alarms (you can add SNS later)
new aws.cloudwatch.MetricAlarm("ec2CpuHigh", {
  metricName: "CPUUtilization", namespace: "AWS/EC2", statistic: "Average",
  period: 60, evaluationPeriods: 2, threshold: 80, comparisonOperator: "GreaterThanThreshold",
  dimensions: { InstanceId: api.id }
});
new aws.cloudwatch.MetricAlarm("rdsConnHigh", {
  metricName: "DatabaseConnections", namespace: "AWS/RDS", statistic: "Average",
  period: 60, evaluationPeriods: 1, threshold: 50, comparisonOperator: "GreaterThanThreshold",
  dimensions: { DBInstanceIdentifier: rds.id }
});

// Outputs
export const frontendBucketName = bucket.bucket;
export const cloudfrontDomain = cfDomain;
export const apiPublicIp = api.publicIp;
export const rdsEndpoint = rds.address;
