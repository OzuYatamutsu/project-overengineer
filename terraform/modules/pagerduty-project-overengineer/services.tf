resource "pagerduty_service" "project-overengineer-fe" {
  name              = "project-overengineer-fe"
  escalation_policy = pagerduty_escalation_policy.fe.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}
