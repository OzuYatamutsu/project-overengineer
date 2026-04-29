resource "pagerduty_escalation_policy" "fe" {
  name = "FE"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "user_reference"
      id   = pagerduty_user.seanl_seancotech_com.id
    }
  }
}

resource "pagerduty_escalation_policy" "ocr" {
  name = "OCR"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "user_reference"
      id   = pagerduty_user.seanl_seancotech_com.id
    }
  }
}

resource "pagerduty_escalation_policy" "storage" {
  name = "Storage"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "user_reference"
      id   = pagerduty_user.seanl_seancotech_com.id
    }
  }
}

resource "pagerduty_escalation_policy" "observability" {
  name = "Observability"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5

    target {
      type = "user_reference"
      id   = pagerduty_user.seanl_seancotech_com.id
    }
  }
}
