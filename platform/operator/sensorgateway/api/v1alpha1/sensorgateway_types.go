package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SensorGatewaySpec defines the desired state of SensorGateway
type SensorGatewaySpec struct {
	// Site identifier (e.g., "plant-a", "refinery-1")
	// +kubebuilder:validation:Required
	Site string `json:"site"`

	// Communication protocol
	// +kubebuilder:validation:Enum=mqtt;modbus-tcp;opc-ua
	// +kubebuilder:default=mqtt
	Protocol string `json:"protocol,omitempty"`

	// Sample interval in seconds
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=3600
	// +kubebuilder:default=5
	SampleIntervalSeconds int `json:"sampleIntervalSeconds,omitempty"`

	// Alert profile for threshold evaluation
	// +kubebuilder:validation:Enum=gas-detection;cems;water-quality;indoor-air
	// +kubebuilder:default=gas-detection
	AlertProfile string `json:"alertProfile,omitempty"`
}

// SensorGatewayStatus defines the observed state of SensorGateway
type SensorGatewayStatus struct {
	// Whether the gateway is ready and connected
	Ready bool `json:"ready,omitempty"`

	// Last time telemetry was received
	LastSeen string `json:"lastSeen,omitempty"`

	// Current conditions
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Site",type=string,JSONPath=`.spec.site`
// +kubebuilder:printcolumn:name="Protocol",type=string,JSONPath=`.spec.protocol`
// +kubebuilder:printcolumn:name="Ready",type=boolean,JSONPath=`.status.ready`
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// SensorGateway is the Schema for the sensorgateways API
type SensorGateway struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   SensorGatewaySpec   `json:"spec,omitempty"`
	Status SensorGatewayStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// SensorGatewayList contains a list of SensorGateway
type SensorGatewayList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []SensorGateway `json:"items"`
}

func init() {
	SchemeBuilder.Register(&SensorGateway{}, &SensorGatewayList{})
}
