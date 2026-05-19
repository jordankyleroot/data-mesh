terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "datamesh-tfstate-staging"
    key    = "staging/terraform.tfstate"
    region = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags { tags = local.tags }
}

locals {
  env  = "staging"
  name = "datamesh-${local.env}"
  tags = {
    Environment = local.env
    Project     = "data-mesh"
    ManagedBy   = "terraform"
  }
}

module "vpc" {
  source = "../../modules/vpc"
  name   = local.name
  cidr   = "10.10.0.0/16"
  azs    = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.10.1.0/24", "10.10.2.0/24", "10.10.3.0/24"]
  public_subnets  = ["10.10.101.0/24", "10.10.102.0/24", "10.10.103.0/24"]
  tags   = local.tags
}

module "kms" {
  source      = "../../modules/kms"
  name        = local.name
  description = "Data Mesh ${local.env} encryption"
  tags        = local.tags
}

module "msk" {
  source         = "../../modules/msk"
  name           = local.name
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnets
  kms_key_arn    = module.kms.key_arn
  instance_type  = "kafka.m5.large"
  broker_count   = 3
  volume_size_gb = 200
  tags           = local.tags
}

module "eks" {
  source        = "../../modules/eks"
  name          = local.name
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnets
  node_type     = "m5.xlarge"
  min_nodes     = 2
  max_nodes     = 6
  desired_nodes = 3
  tags          = local.tags
}

module "schema_registry" {
  source         = "../../modules/schema-registry"
  name           = local.name
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnets
  msk_bootstrap  = module.msk.bootstrap_brokers_tls
  msk_sg_id      = module.msk.security_group_id
  kms_key_arn    = module.kms.key_arn
  tags           = local.tags
}

module "iam" {
  source      = "../../modules/iam"
  name        = local.name
  cluster_arn = module.msk.cluster_arn
  tags        = local.tags
}

output "msk_bootstrap"          { value = module.msk.bootstrap_brokers_tls  sensitive = true }
output "schema_registry_url"    { value = module.schema_registry.endpoint }
output "eks_cluster_name"       { value = module.eks.cluster_name }
output "producer_role_arn"      { value = module.iam.producer_role_arn }
output "consumer_role_arn"      { value = module.iam.consumer_role_arn }
