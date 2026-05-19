variable "name"       { type = string }
variable "cluster_arn" { type = string }
variable "tags"       { type = map(string) default = {} }

# Producer IAM role — write to topics, register schemas
resource "aws_iam_role" "producer" {
  name = "${var.name}-producer"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_iam_policy" "producer" {
  name = "${var.name}-producer-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "MSKProducer"
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:WriteData",
          "kafka-cluster:CreateTopic"
        ]
        Resource = [
          "${var.cluster_arn}",
          "${var.cluster_arn}/topic/domain.*"
        ]
      },
      {
        Sid    = "SchemaRegistryWrite"
        Effect = "Allow"
        Action = ["execute-api:Invoke"]
        Resource = "arn:aws:execute-api:*:*:*/*/POST/subjects/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "producer" {
  role       = aws_iam_role.producer.name
  policy_arn = aws_iam_policy.producer.arn
}

# Consumer IAM role — read from topics
resource "aws_iam_role" "consumer" {
  name = "${var.name}-consumer"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_iam_policy" "consumer" {
  name = "${var.name}-consumer-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "MSKConsumer"
        Effect = "Allow"
        Action = [
          "kafka-cluster:Connect",
          "kafka-cluster:DescribeGroup",
          "kafka-cluster:AlterGroup",
          "kafka-cluster:DescribeTopic",
          "kafka-cluster:ReadData"
        ]
        Resource = [
          "${var.cluster_arn}",
          "${var.cluster_arn}/topic/*",
          "${var.cluster_arn}/group/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "consumer" {
  role       = aws_iam_role.consumer.name
  policy_arn = aws_iam_policy.consumer.arn
}

# Portal service account role
resource "aws_iam_role" "portal" {
  name = "${var.name}-portal"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_iam_policy" "portal" {
  name = "${var.name}-portal-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "MSKAdmin"
        Effect = "Allow"
        Action = [
          "kafka:CreateTopic", "kafka:DeleteTopic", "kafka:DescribeTopic",
          "kafka:ListTopics", "kafka:UpdateBrokerCount", "kafka:GetBootstrapBrokers",
          "kafka-cluster:Connect", "kafka-cluster:DescribeCluster",
          "kafka-cluster:CreateTopic", "kafka-cluster:DescribeTopic",
          "kafka-cluster:AlterTopic", "kafka-cluster:DeleteTopic"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "portal" {
  role       = aws_iam_role.portal.name
  policy_arn = aws_iam_policy.portal.arn
}

output "producer_role_arn" { value = aws_iam_role.producer.arn }
output "consumer_role_arn" { value = aws_iam_role.consumer.arn }
output "portal_role_arn"   { value = aws_iam_role.portal.arn }
