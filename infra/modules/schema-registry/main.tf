variable "name"              { type = string }
variable "vpc_id"            { type = string }
variable "subnet_ids"        { type = list(string) }
variable "msk_bootstrap"     { type = string }
variable "msk_sg_id"         { type = string }
variable "kms_key_arn"       { type = string }
variable "tags"              { type = map(string) default = {} }

# ECS Fargate cluster running Confluent Schema Registry OSS
resource "aws_ecs_cluster" "schema_registry" {
  name = "${var.name}-schema-registry"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = var.tags
}

resource "aws_security_group" "sr" {
  name        = "${var.name}-schema-registry"
  vpc_id      = var.vpc_id
  description = "Schema Registry"

  ingress {
    from_port   = 8081
    to_port     = 8081
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "sr" {
  name              = "/ecs/${var.name}-schema-registry"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn
  tags              = var.tags
}

resource "aws_ecs_task_definition" "sr" {
  family                   = "${var.name}-schema-registry"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.sr_exec.arn
  task_role_arn            = aws_iam_role.sr_task.arn

  container_definitions = jsonencode([{
    name  = "schema-registry"
    image = "confluentinc/cp-schema-registry:7.5.0"
    portMappings = [{ containerPort = 8081 }]
    environment = [
      { name = "SCHEMA_REGISTRY_HOST_NAME",                       value = "schema-registry" },
      { name = "SCHEMA_REGISTRY_LISTENERS",                       value = "http://0.0.0.0:8081" },
      { name = "SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS",    value = var.msk_bootstrap },
      { name = "SCHEMA_REGISTRY_KAFKASTORE_SECURITY_PROTOCOL",    value = "SASL_SSL" },
      { name = "SCHEMA_REGISTRY_KAFKASTORE_SASL_MECHANISM",       value = "AWS_MSK_IAM" },
      { name = "SCHEMA_REGISTRY_KAFKASTORE_SASL_JAAS_CONFIG",     value = "software.amazon.msk.auth.iam.IAMLoginModule required;" },
      { name = "SCHEMA_REGISTRY_KAFKASTORE_SASL_CLIENT_CALLBACK_HANDLER_CLASS", value = "software.amazon.msk.auth.iam.IAMClientCallbackHandler" },
      { name = "SCHEMA_REGISTRY_AVRO_COMPATIBILITY_LEVEL",        value = "FULL_TRANSITIVE" },
      { name = "SCHEMA_REGISTRY_SCHEMA_COMPATIBILITY_LEVEL",      value = "FULL_TRANSITIVE" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.sr.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8081/subjects || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

resource "aws_ecs_service" "sr" {
  name            = "${var.name}-schema-registry"
  cluster         = aws_ecs_cluster.schema_registry.id
  task_definition = aws_ecs_task_definition.sr.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.sr.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.sr.arn
    container_name   = "schema-registry"
    container_port   = 8081
  }
}

resource "aws_lb" "sr" {
  name               = "${var.name}-sr"
  internal           = true
  load_balancer_type = "application"
  subnets            = var.subnet_ids
  security_groups    = [aws_security_group.sr.id]
  tags               = var.tags
}

resource "aws_lb_target_group" "sr" {
  name        = "${var.name}-sr"
  port        = 8081
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/subjects"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_lb_listener" "sr" {
  load_balancer_arn = aws_lb.sr.arn
  port              = 8081
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sr.arn
  }
}

resource "aws_iam_role" "sr_exec" {
  name = "${var.name}-sr-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy_attachment" "sr_exec" {
  role       = aws_iam_role.sr_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "sr_task" {
  name = "${var.name}-sr-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_role_policy" "sr_msk" {
  name = "msk-access"
  role = aws_iam_role.sr_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["kafka-cluster:Connect", "kafka-cluster:DescribeTopic", "kafka-cluster:ReadData", "kafka-cluster:WriteData", "kafka-cluster:CreateTopic"]
        Resource = "*"
      }
    ]
  })
}

data "aws_region" "current" {}

output "endpoint"         { value = "http://${aws_lb.sr.dns_name}:8081" }
output "load_balancer_dns" { value = aws_lb.sr.dns_name }
