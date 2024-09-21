import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export class AwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The bucket name must match the domain name since
    // s3 proxy requires host name to match bucket name
    // and Host override is a cloudflare enterprise only feature
    const bucketName = "aws.seaotterstudio.com";

    const logsBucket = new s3.Bucket(this, "LogsBucket", {
      bucketName: `${bucketName}-logs`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Define policy to deny access log bucket
    const denyAll = new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      actions: ["s3:*"],
      resources: [logsBucket.arnForObjects("*")],
      principals: [new iam.AnyPrincipal()],
    });

    logsBucket.addToResourcePolicy(denyAll);

    // Do not enforce SSL as that will require CloudFront
    // We will have SSL termination at CloudFlare
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      websiteIndexDocument: "index.html",
      serverAccessLogsBucket: logsBucket,
      serverAccessLogsPrefix: "access-logs",
    });

    // Define policy to allow public read access
    const publicRead = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ["s3:GetObject"],
      resources: [siteBucket.arnForObjects("*")],
    });

    siteBucket.addToResourcePolicy(publicRead);
  }
}
