#!/usr/bin/env python3
"""Synthesize the Reel's original score and sound effects on a beat grid.

Usage: python3 score.py <plan.json> <out.wav>
plan.json: {"bpm":128,"beats":40,"drop":2,"break":[30,32],"cuts":[2,6,14,22,30,32],"ticks":[beat,...],"prog":0,"seed":0}

Style: 124 to 132 BPM, minor key, four-on-the-floor. `prog` picks one of three chord progressions and `seed` the arpeggio. A filtered intro with a riser, a drop,
a short break with a second riser, an impact on the logo, and a tail.
Everything is generated here from maths: nothing downloaded, nothing to license.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(11)


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / a) * np.exp(-np.maximum(0.0, t - a) / r)


def onepole(x, alpha):
    # vectorised one-pole low-pass (exponential moving average) via cumulative trick in blocks
    y = np.empty_like(x)
    acc = 0.0
    a = float(alpha)
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def hp(x, alpha):
    return x - onepole(x, alpha)


def put(buf, t, sig, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig), 0] += sig * gain * (1.0 - max(0.0, pan))
    buf[i : i + len(sig), 1] += sig * gain * (1.0 + min(0.0, pan))


def kick():
    n = int(0.36 * SR)
    t = np.arange(n) / SR
    f = 52 + 130 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.13)
    click = hp(rng.standard_normal(n), 0.5) * env(n, 0.0005, 0.004) * 0.25
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.22 * SR)
    x = hp(rng.standard_normal(n), 0.2)
    e = sum(np.roll(env(n, 0.001, 0.02), int(d * SR)) * (np.arange(n) >= int(d * SR)) for d in (0, 0.011, 0.023)) + env(n, 0.001, 0.07) * 0.6
    return x * e * 0.35


def hat(length=0.04, decay=0.012):
    n = int(length * SR)
    return hp(rng.standard_normal(n), 0.7) * env(n, 0.0005, decay) * 0.3


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    x = np.zeros(n)
    for d in (-detune, 0.0, detune):
        ph = (t * freq * (1 + d)) % 1.0
        x += 2 * ph - 1
    return x / 3


def bass(freq, dur):
    n = int(dur * SR)
    x = onepole(saw(freq * 2, n, 0.003), 0.09) * 1.8 + np.sin(2 * np.pi * freq * np.arange(n) / SR) * 0.35
    return np.tanh(x * 1.3) * env(n, 0.004, dur * 0.5)


def pluck(freq, dur=0.22):
    n = int(dur * SR)
    return onepole(saw(freq, n, 0.004), 0.25) * env(n, 0.002, 0.07)


def pad(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(saw(f, n, 0.006) for f in freqs) / len(freqs)
    x = onepole(x, 0.03)
    a = np.minimum(1.0, t / 0.3) * np.clip((dur - t) / 0.3, 0, 1)
    return x * a


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / n
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 48
    for b in range(blocks):
        i0, i1 = n * b // blocks, n * (b + 1) // blocks
        alpha = 0.01 + 0.5 * (b / blocks) ** 2
        out[i0:i1] = onepole(noise[i0:i1], alpha)
    tone = np.sin(2 * np.pi * np.cumsum(180 + 900 * t**2) / SR) * 0.25
    return (out * 1.6 + tone) * t**1.6


def impact():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(48 + 80 * np.exp(-t / 0.06)) / SR) * env(n, 0.001, 0.4)
    crash = onepole(hp(rng.standard_normal(n), 0.35), 0.35) * env(n, 0.001, 0.4) * 0.35
    return np.tanh((sub * 1.4 + crash))


def whoosh():
    n = int(0.36 * SR)
    t = np.arange(n) / n
    x = onepole(rng.standard_normal(n), 0.12) * 3
    return hp(x, 0.01) * np.sin(np.pi * t) ** 2 * (0.3 + 0.7 * t)


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * env(n, 0.0005, 0.006) * 0.5


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def main():
    plan = json.load(open(sys.argv[1]))
    bpm, beats = plan["bpm"], plan["beats"]
    beat = 60.0 / bpm
    drop = plan.get("drop", 4)
    br0, br1 = plan.get("break", [beats, beats])
    dur = beats * beat + 0.8
    n = int(dur * SR)
    drums, mus, fx = np.zeros((n, 2)), np.zeros((n, 2)), np.zeros((n, 2))
    # F minor: Fm - Db - Ab - Eb, one chord per bar
    progs = [
        [(29, (53, 56, 60)), (25, (53, 56, 61)), (32, (51, 56, 60)), (27, (51, 55, 58))],  # Fm  Db  Ab  Eb
        [(33, (57, 60, 64)), (29, (57, 60, 65)), (24, (55, 60, 64)), (31, (55, 59, 62))],  # Am  F   C   G
        [(26, (57, 62, 65)), (22, (58, 62, 65)), (29, (57, 60, 65)), (24, (55, 60, 64))],  # Dm  Bb  F   C
    ]
    prog = progs[plan.get("prog", 0) % len(progs)]
    arps = [(0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2, 0, 2, 1, 0), (0, 1, 2, 1, 0, 1, 2, 2, 0, 1, 2, 1, 2, 1, 0, 1), (2, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 2, 1, 0, 1, 2)]
    arp = arps[plan.get("seed", 0) % len(arps)]
    k, c, h, oh = kick(), clap(), hat(), hat(0.14, 0.05)
    duck = np.ones(n)
    for b in range(beats):
        t = b * beat
        bar = (max(0, b - drop)) // 4
        root, chord = prog[bar % 4]
        in_intro, in_break, in_out = b < drop, br0 <= b < br1, b >= br1
        full = not in_intro and not in_break and not in_out
        if b % 4 == 0 and not in_break:
            put(mus, t, pad([hz(x) for x in chord], 4 * beat), 0.5 if (in_intro or in_out) else 0.36)
        if full:
            put(drums, t, k, 1.0)
            i = int(t * SR)
            m = int(0.22 * SR)
            duck[i : i + m] = np.minimum(duck[i : i + m], np.linspace(0.25, 1.0, m)[: len(duck[i : i + m])])
            put(drums, t + beat / 2, oh, 0.32, pan=0.15)
            for q in (0.0, 0.25, 0.75):
                put(drums, t + q * beat, h, 0.16, pan=-0.2)
            if b % 2 == 1:
                put(drums, t, c, 0.6)
            put(mus, t + beat / 2, bass(hz(root), beat * 0.45), 0.9)
            put(mus, t + beat * 0.75, bass(hz(root + 12), beat * 0.2), 0.45)
            for s in range(4):
                idx = (b * 4 + s) % 16
                put(mus, t + s * beat / 4, pluck(hz(chord[arp[idx]] + 12)), 0.3, pan=0.4 if s % 2 else -0.4)
        elif in_intro:
            for s in range(2):
                put(mus, t + s * beat / 2, pluck(hz(chord[(b * 2 + s) % 3] + 12)), 0.22 + 0.05 * b)
            put(drums, t, h, 0.3 + 0.1 * b)
        elif in_out and b == br1:
            put(mus, t, bass(hz(root), beat * 2), 0.7)
    mus *= duck[:, None]
    # risers into the drop and out of the break; impacts on both
    put(fx, 0.0, riser(max(0.3, drop * beat)), 0.5)
    put(fx, drop * beat, impact(), 0.8)
    if br1 < beats:
        put(fx, br0 * beat, riser((br1 - br0) * beat), 0.6)
        put(fx, br1 * beat, impact(), 1.0)
    for cb in plan.get("cuts", []):
        put(fx, cb * beat - 0.3, whoosh(), 0.55, pan=0.3 if cb % 8 else -0.3)
    for tb in plan.get("ticks", []):
        put(fx, tb * beat, tick(), 0.6)
    mix = drums * 0.62 + mus * 0.95 + fx * 0.42
    fo = int(0.7 * SR)
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
    mix = np.tanh(mix * 1.1)
    mix = mix / (np.abs(mix).max() or 1.0) * 0.89
    with wave.open(sys.argv[2], "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype("<i2").tobytes())
    print(json.dumps({"seconds": round(dur, 2), "bpm": bpm, "beats": beats}))


if __name__ == "__main__":
    main()
