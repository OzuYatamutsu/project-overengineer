resource "pagerduty_service" "project-overengineer-fe" {
  name              = "project-overengineer-fe"
  escalation_policy = pagerduty_escalation_policy.fe.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "ocr-worker" {
  name              = "ocr-worker"
  escalation_policy = pagerduty_escalation_policy.ocr.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "ollama-ocr" {
  name              = "ollama-ocr"
  escalation_policy = pagerduty_escalation_policy.ocr.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "status-api" {
  name              = "status-api"
  escalation_policy = pagerduty_escalation_policy.fe.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "janitor" {
  name              = "janitor"
  escalation_policy = pagerduty_escalation_policy.storage.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "redis" {
  name              = "redis"
  escalation_policy = pagerduty_escalation_policy.storage.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "vault" {
  name              = "vault"
  escalation_policy = pagerduty_escalation_policy.storage.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "alloy" {
  name              = "alloy"
  escalation_policy = pagerduty_escalation_policy.observability.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "mimir" {
  name              = "mimir"
  escalation_policy = pagerduty_escalation_policy.observability.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "tempo" {
  name              = "tempo"
  escalation_policy = pagerduty_escalation_policy.observability.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "loki" {
  name              = "loki"
  escalation_policy = pagerduty_escalation_policy.observability.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}

resource "pagerduty_service" "grafana" {
  name              = "grafana"
  escalation_policy = pagerduty_escalation_policy.observability.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}
