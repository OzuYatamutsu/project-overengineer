terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 2.0.0"
    }
  }

  required_version = ">= 1.0.0"
}
