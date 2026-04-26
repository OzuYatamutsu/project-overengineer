resource "pagerduty_user" "seanl_seancotech_com" {
  name  = "Sean Lam"
  email = "seanl@seancotech.com"
}

resource "pagerduty_escalation_policy" "fe" {
  name      = "FE"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "user"
      id   = pagerduty_user.seanl_seancotech_com.id
    }
  }
}

resource "pagerduty_service" "project-overengineer-fe" {
  name              = "project-overengineer-fe"
  escalation_policy = pagerduty_escalation_policy.fe.id

  incident_urgency_rule {
    type = "constant"
    urgency = "high"
  }
}