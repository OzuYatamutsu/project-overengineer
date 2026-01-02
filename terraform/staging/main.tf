terraform {
    required_providers {
        oci = {
            source = "oracle/oci"
        }
    }
}

provider "oci" {
    region = "ca-toronto-1"
    auth = "SecurityToken"
    config_file_profile = "tf-project-overengineer"
}

resource "oci_core_vcn" "internal" {
    dns_label = "internal"
    cidr_block = "172.16.0.0/20"
    compartment_id = "ocid1.tenancy.oc1..aaaaaaaasz4c4v6umng7swqlgy5leajulguixsgloinsvcciub2hrsqp2jya"
    display_name = "project-overengineer-vcn"
}
