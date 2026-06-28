package core

type RNG func() float64

func CreateRNG(seed uint32) RNG {
	s := seed
	return func() float64 {
		s += 0x6D2B79F5
		t := s
		t = (t ^ (t >> 15)) * (t | 1)
		t ^= t + (t ^ (t >> 7)) * (t | 61)
		res := (t ^ (t >> 14))
		return float64(res) / 4294967296.0
	}
}
