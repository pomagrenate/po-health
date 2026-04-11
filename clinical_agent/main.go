// clinical_agent — A cheesepath-powered clinical AI agent for Po-Health.
//
// This HTTP service receives vital-sign breach events from the FastAPI server,
// runs a cheesepath ReAct agent with Po-Health-specific tools, and returns a
// rich ADR (Adverse Drug Reaction) analysis.
//
// Environment variables:
//
//	LLM_URL          OpenAI-compatible LLM endpoint  (default: http://127.0.0.1:8081)
//	LLM_MODEL        Model name                       (default: default)
//	PO_HEALTH_URL    FastAPI server address            (default: http://127.0.0.1:8000)
//	LISTEN_ADDR      Bind address for this service     (default: :8090)
//	MAX_STEPS        Max agent reasoning steps         (default: 12)
//
// Usage:
//
//	cd clinical_agent && go run .
//
// The FastAPI server calls this service automatically when CLINICAL_AGENT_URL
// is set (e.g. CLINICAL_AGENT_URL=http://localhost:8090).
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/AutoCookies/crabpath/agent"
	"github.com/AutoCookies/crabpath/callback"
	"github.com/AutoCookies/crabpath/llm"
	"github.com/AutoCookies/crabpath/memory"
	"github.com/AutoCookies/crabpath/tools"
)

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envIntOr(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

// AnalyzeRequest is the JSON body sent by the FastAPI server.
type AnalyzeRequest struct {
	PatientID   string                   `json:"patient_id"`
	VitalName   string                   `json:"vital_name"`
	Value       float64                  `json:"value"`
	Medications []map[string]interface{} `json:"medications"`
	Threshold   map[string]interface{}   `json:"threshold"`
}

// AnalyzeResponse is returned to the FastAPI server.
type AnalyzeResponse struct {
	PatientID string `json:"patient_id"`
	VitalName string `json:"vital_name"`
	Value     float64 `json:"value"`
	Analysis  string `json:"analysis"`
	Steps     int    `json:"steps"`
	DurationMs int64 `json:"duration_ms"`
	Error     string `json:"error,omitempty"`
}

// ---------------------------------------------------------------------------
// Agent goal builder
// ---------------------------------------------------------------------------

func buildGoal(req AnalyzeRequest) string {
	medNames := make([]string, 0, len(req.Medications))
	for _, m := range req.Medications {
		if name, ok := m["drug_name"].(string); ok && name != "" {
			medNames = append(medNames, name)
		}
	}

	thresholdDesc := ""
	if req.Threshold != nil {
		parts := []string{}
		if min, ok := req.Threshold["min_value"]; ok && min != nil {
			parts = append(parts, fmt.Sprintf("min=%.1f", toFloat(min)))
		}
		if max, ok := req.Threshold["max_value"]; ok && max != nil {
			parts = append(parts, fmt.Sprintf("max=%.1f", toFloat(max)))
		}
		if len(parts) > 0 {
			thresholdDesc = " (threshold: " + strings.Join(parts, ", ") + ")"
		}
	}

	medsDesc := "none recorded"
	if len(medNames) > 0 {
		medsDesc = strings.Join(medNames, ", ")
	}

	return fmt.Sprintf(
		`Patient %s has a %s reading of %.1f%s which has breached the configured alert threshold.

Current medications: %s

Your task:
1. Search clinical guidelines for information about %s elevation and adverse drug reactions.
2. Check for drug-drug interactions among the patient's medications using their names.
3. Search for any drugs in the database related to %s adverse effects.
4. Based on the evidence gathered, provide a concise clinical assessment:
   - Which medication(s) are most likely to be responsible for the %s abnormality?
   - What is the recommended immediate clinical action?
   - What monitoring or dose adjustment should be considered?

Keep your final answer under 300 words and use clinical language appropriate for a physician.`,
		req.PatientID,
		req.VitalName, req.Value, thresholdDesc,
		medsDesc,
		req.VitalName,
		req.VitalName,
		req.VitalName,
	)
}

func toFloat(v interface{}) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case int:
		return float64(x)
	case json.Number:
		f, _ := x.Float64()
		return f
	}
	return 0
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

func analyzeHandler(client *llm.Client, poHealthAddr, model string, maxSteps int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}

		var req AnalyzeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.PatientID == "" || req.VitalName == "" {
			http.Error(w, "patient_id and vital_name are required", http.StatusBadRequest)
			return
		}

		start := time.Now()
		goal  := buildGoal(req)

		registry := tools.NewClinicalRegistry(poHealthAddr)

		exec := agent.NewExecutor(
			client,
			registry,
			agent.WithStrategy(agent.NewReActStrategy()),
			agent.WithMemory(memory.NewBoundedBufferMemory(20)),
			agent.WithCallbacks(callback.NewLogHandler(os.Stdout)),
			agent.WithMaxSteps(maxSteps),
			agent.WithModel(model),
		)

		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()

		events, path := exec.Run(ctx, goal)
		// Drain the event channel
		for range events {
		}

		resp := AnalyzeResponse{
			PatientID:  req.PatientID,
			VitalName:  req.VitalName,
			Value:      req.Value,
			Steps:      len(path.Steps),
			DurationMs: time.Since(start).Milliseconds(),
		}

		if path.Status == agent.PathFailed || path.Status == agent.PathAborted {
			resp.Error = fmt.Sprintf("agent %s", path.Status)
			resp.Analysis = path.Answer // may contain partial reasoning
		} else {
			resp.Analysis = path.Answer
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp) //nolint:errcheck
	}
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"status":"ok","service":"clinical_agent"}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	llmURL      := envOr("LLM_URL", "http://127.0.0.1:8081")
	llmModel    := envOr("LLM_MODEL", "default")
	poHealthURL := envOr("PO_HEALTH_URL", "http://127.0.0.1:8000")
	listenAddr  := envOr("LISTEN_ADDR", ":8090")
	maxSteps    := envIntOr("MAX_STEPS", 12)

	log.Printf("clinical_agent starting")
	log.Printf("  LLM endpoint   : %s  (model: %s)", llmURL, llmModel)
	log.Printf("  Po-Health URL  : %s", poHealthURL)
	log.Printf("  Listen         : %s", listenAddr)
	log.Printf("  Max agent steps: %d", maxSteps)

	client := llm.NewClient(
		llmURL,
		llm.WithMaxRetries(3),
		llm.WithRetryBaseDelay(time.Second),
		llm.WithStreamTimeout(45*time.Second),
	)

	mux := http.NewServeMux()
	mux.HandleFunc("/analyze", analyzeHandler(client, poHealthURL, llmModel, maxSteps))
	mux.HandleFunc("/health",  healthHandler)

	log.Printf("clinical_agent ready — listening on %s", listenAddr)
	if err := http.ListenAndServe(listenAddr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
