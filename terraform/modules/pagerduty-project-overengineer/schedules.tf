resource "pagerduty_schedule" "FE" {
  name      = "FE Rotation"
  time_zone = "Etc/UTC"

  layer {
    name                         = "24/7"
    start                        = "20260429T00:00:00Z"
    rotation_virtual_start       = "20260429T00:00:00Z"
    rotation_turn_length_seconds = 86400
    users                        = [pagerduty_user.seanl_seancotech_com.id]
  }
}

resource "pagerduty_schedule" "OCR" {
  name      = "OCR Rotation"
  time_zone = "Etc/UTC"

  layer {
    name                         = "24/7"
    start                        = "20260429T00:00:00Z"
    rotation_virtual_start       = "20260429T00:00:00Z"
    rotation_turn_length_seconds = 86400
    users                        = [pagerduty_user.seanl_seancotech_com.id]
  }
}

resource "pagerduty_schedule" "Storage" {
  name      = "Storage Rotation"
  time_zone = "Etc/UTC"

  layer {
    name                         = "24/7"
    start                        = "20260429T00:00:00Z"
    rotation_virtual_start       = "20260429T00:00:00Z"
    rotation_turn_length_seconds = 86400
    users                        = [pagerduty_user.seanl_seancotech_com.id]
  }
}

resource "pagerduty_schedule" "Observability" {
  name      = "Observability Rotation"
  time_zone = "Etc/UTC"

  layer {
    name                         = "24/7"
    start                        = "20260429T00:00:00Z"
    rotation_virtual_start       = "20260429T00:00:00Z"
    rotation_turn_length_seconds = 86400
    users                        = [pagerduty_user.seanl_seancotech_com.id]
  }
}
