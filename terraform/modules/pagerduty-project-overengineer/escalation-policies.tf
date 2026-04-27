resource "pagerduty_escalation_policy" "fe" {
  name = "FE"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "user_reference"
      id   = pagerduty_user.seanc_seancotech_com.id
    }
  }
}
