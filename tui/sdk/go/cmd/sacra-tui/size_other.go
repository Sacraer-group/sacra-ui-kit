//go:build !linux && !darwin && !freebsd

package main

// Other platforms use --width/--height or 80x32. Windows ANSI requires VT support.
func dimensions() (int, int) { return 0, 0 }
