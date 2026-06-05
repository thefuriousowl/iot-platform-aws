/*
Copyright 2026.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"time"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	iotv1alpha1 "github.com/thefuriousowl/iot-platform-aws/platform/operator/sensorgateway/api/v1alpha1"
)

// SensorGatewayReconciler reconciles a SensorGateway object
type SensorGatewayReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=iot.iot.example.com,resources=sensorgateways,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=iot.iot.example.com,resources=sensorgateways/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=iot.iot.example.com,resources=sensorgateways/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.23.3/pkg/reconcile
func (r *SensorGatewayReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	// ──────────────────────────────────────────────────────────────
	// Step 1: Fetch the SensorGateway resource
	// ──────────────────────────────────────────────────────────────
	gateway := &iotv1alpha1.SensorGateway{}
	err := r.Get(ctx, req.NamespacedName, gateway)
	if err != nil {
		if errors.IsNotFound(err) {
			// Resource is removed. Nothing to do
			logger.Info("SensorGateway resource not found, ignoring")
			return ctrl.Result{}, nil
		}
		// Error อื่นๆ - retry
		logger.Error(err, "Failed to get SensorGateway")
		return ctrl.Result{}, err
	}
	// ──────────────────────────────────────────────────────────────
	// Step 2: Update Status
	// ──────────────────────────────────────────────────────────────
	logger.Info("Reconciling SensorGateway",
		"site", gateway.Spec.Site,
		"protocol", gateway.Spec.Protocol,
	)

	// Set Ready = true และ LastSeen = now
	gateway.Status.Ready = true
	gateway.Status.LastSeen = time.Now().Format(time.RFC3339)

	// ──────────────────────────────────────────────────────────────
	// Step 3: Set Condition (standard K8s pattern)
	// ──────────────────────────────────────────────────────────────
	meta.SetStatusCondition(&gateway.Status.Conditions, metav1.Condition{
		Type:               "Ready",
		Status:             metav1.ConditionTrue,
		Reason:             "GatewayConfigured",
		Message:            "Gateway is configured and ready",
		LastTransitionTime: metav1.Now(),
	})

	// ──────────────────────────────────────────────────────────────
	// Step 4: Persist status update to API server
	// ──────────────────────────────────────────────────────────────
	if err := r.Status().Update(ctx, gateway); err != nil {
		logger.Error(err, "Failed to update SensorGateway status")
		return ctrl.Result{}, err
	}

	logger.Info("Successfully reconciled SensorGateway",
		"ready", gateway.Status.Ready,
		"lastSeen", gateway.Status.LastSeen,
	)

	// ──────────────────────────────────────────────────────────────
	// Step 5: Requeue after 30 seconds (periodic health check)
	// ──────────────────────────────────────────────────────────────
	return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *SensorGatewayReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&iotv1alpha1.SensorGateway{}).
		Named("sensorgateway").
		Complete(r)
}
