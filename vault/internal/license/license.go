/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
package license

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type LicenseInfo struct {
	ID        string `json:"id"`
	Tier      string `json:"tier"`
	Product   string `json:"product"`
	ExpiresAt string `json:"expires_at"`
	MaxNodes  int    `json:"max_nodes"`
	Valid     bool   `json:"valid"`
}

func Validate(key, validateURL string) (*LicenseInfo, error) {
	if key == "" {
		return nil, fmt.Errorf("license_key is empty — set it in vault.yml")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", validateURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("X-Product", "vault")
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		// Offline mode — allow startup with warning
		return &LicenseInfo{
			ID:        key[:12] + "...",
			Tier:      "offline",
			Product:   "vault",
			ExpiresAt: "unknown",
			Valid:     true,
		}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("license server returned %d", resp.StatusCode)
	}

	var info LicenseInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	if !info.Valid {
		return nil, fmt.Errorf("license is invalid or expired")
	}

	return &info, nil
}
