terraform {
  required_providers {
    oci = {
      source = "oracle/oci"
    }
  }
}

provider "oci" {
  region              = "ca-toronto-1"
  auth                = "SecurityToken"
  config_file_profile = "tf-project-overengineer"
}

resource "oci_core_vcn" "internal" {
  dns_label      = "internal"
  cidr_block     = "172.16.0.0/24"
  compartment_id = "ocid1.tenancy.oc1..aaaaaaaasz4c4v6umng7swqlgy5leajulguixsgloinsvcciub2hrsqp2jya"
  display_name   = "project-overengineer-vcn"
}

resource "oci_core_subnet" "staging" {
  vcn_id                     = oci_core_vcn.internal.id
  cidr_block                 = "172.16.0.0/24"
  compartment_id             = "ocid1.tenancy.oc1..aaaaaaaasz4c4v6umng7swqlgy5leajulguixsgloinsvcciub2hrsqp2jya"
  display_name               = "project-overengineer-subnet-1"
  prohibit_public_ip_on_vnic = false
  dns_label                  = "staging"
}

resource "oci_containerengine_cluster" "oke" {
  name               = "staging"
  compartment_id     = oci_core_vcn.internal.compartment_id
  vcn_id             = oci_core_vcn.internal.id
  kubernetes_version = "v1.34.1"

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = oci_core_subnet.staging.id
  }
}

resource "oci_containerengine_node_pool" "staging" {
  cluster_id          = oci_containerengine_cluster.oke.id
  name                = "staging-pool"
  compartment_id      = oci_core_vcn.internal.compartment_id
  kubernetes_version  = oci_containerengine_cluster.oke.kubernetes_version
  node_shape          = "VM.Standard.A1.Flex"
  quantity_per_subnet = 1
  subnet_ids          = [oci_core_subnet.staging.id]

  node_source_details {
    source_type = "image"
    image_id    = "ocid1.image.oc1.ca-toronto-1.aaaaaaaat7k6c5lxdfydhcj64y5klm75yc4zu2xf7fbqevk64k3y7cjaaxzq"
  }

  node_shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }
}
