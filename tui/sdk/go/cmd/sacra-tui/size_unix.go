//go:build linux || darwin || freebsd

package main

import (
	"os"
	"syscall"
	"unsafe"
)

func dimensions() (int, int) {
	var s struct{ Rows, Cols, X, Y uint16 }
	_, _, err := syscall.Syscall(syscall.SYS_IOCTL, os.Stdout.Fd(), syscall.TIOCGWINSZ, uintptr(unsafe.Pointer(&s)))
	if err != 0 {
		return 0, 0
	}
	return int(s.Cols), int(s.Rows)
}
