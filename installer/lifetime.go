// Copyright (c) 2024-2026 Axto AI. All rights reserved.
//
// Lifetime (offline) activation: read an installed app's machine id, and put a
// signed .axto-license file (from https://axto.io/app/lifetime) into the app's
// data volume. The engine verifies the file itself — this only checks that it
// belongs to this app and this installation before copying it.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
)

const activationFormat = "axto-lifetime-1"

var machineIDShape = regexp.MustCompile(`^[0-9a-f]{32}$`)

// checkActivationFile returns the machine id a file was issued for, or why it
// cannot be used for this app.
func checkActivationFile(b []byte, slug string) (string, error) {
	var doc struct {
		Format    string `json:"format"`
		Payload   string `json:"payload"`
		Signature string `json:"signature"`
	}
	if err := json.Unmarshal(b, &doc); err != nil || doc.Format != activationFormat || doc.Signature == "" {
		return "", errors.New("this is not an AXTO activation file — download it again from https://axto.io/app/lifetime")
	}
	parts := strings.Split(doc.Payload, "|")
	if len(parts) != 10 || parts[0] != activationFormat {
		return "", errors.New("the activation file is damaged — download it again from https://axto.io/app/lifetime")
	}
	if parts[2] != slug {
		return "", fmt.Errorf("this activation file is for %s, not %s", parts[2], slug)
	}
	if !machineIDShape.MatchString(parts[3]) {
		return "", errors.New("the activation file has no valid machine ID")
	}
	return parts[3], nil
}

// MachineID reads the installation id that a Lifetime activation is bound to.
func MachineID(ctx context.Context, st *Installed) (string, error) {
	p := ProductBySlug(st.Slug)
	if p == nil || p.StateDir == "" {
		return "", errors.New("unknown product")
	}
	o := Options{Product: p, Dir: st.Dir}
	out, err := dockerCmd(ctx, composeArgs(o, "exec", "-T", p.Service, "cat", p.StateDir+"/machine-id")...)
	id := strings.TrimSpace(out)
	if err != nil || !machineIDShape.MatchString(id) {
		return "", fmt.Errorf("could not read the machine ID — start the app once (axto-setup start %s) and try again", p.Slug)
	}
	return id, nil
}

// ActivateOffline copies a Lifetime activation file into the app and restarts it.
func ActivateOffline(ctx context.Context, st *Installed, file string) error {
	p := ProductBySlug(st.Slug)
	if p == nil || p.StateDir == "" {
		return errors.New("unknown product")
	}
	b, err := os.ReadFile(file)
	if err != nil {
		return fmt.Errorf("cannot read %s: %v", file, err)
	}
	want, err := checkActivationFile(b, p.Slug)
	if err != nil {
		return err
	}
	have, err := MachineID(ctx, st)
	if err != nil {
		return err
	}
	if want != have {
		return fmt.Errorf("this file was issued for machine %s, but this installation is %s — activate %s at https://axto.io/app/lifetime", want, have, have)
	}
	o := Options{Product: p, Dir: st.Dir}
	if out, err := dockerCmd(ctx, composeArgs(o, "cp", file, fmt.Sprintf("%s:%s/%s.axto-license", p.Service, p.StateDir, p.Slug))...); err != nil {
		return fmt.Errorf("could not copy the activation file: %s", lastLines(out, 3))
	}
	if out, err := Control(ctx, st, "restart"); err != nil {
		return fmt.Errorf("activated, but the restart failed: %s", lastLines(out, 3))
	}
	return nil
}
