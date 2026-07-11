"use client";
import { useState, useRef } from "react";

// ── Condition system ───────────────────────────────────────────────────────────
const CONDITIONS = {
  healthy:  { fill:"#FFFFF0", stroke:"#C8B89A", label:"Healthy",  color:"#16a34a", emoji:"✓" },
  caries:   { fill:"#8B1A1A", stroke:"#DC2626", label:"Caries",   color:"#dc2626", emoji:"⬤" },
  filled:   { fill:"#1E3A8A", stroke:"#60A5FA", label:"Filled",   color:"#2563eb", emoji:"■" },
  crown:    { fill:"#C0C0C0", stroke:"#6B7280", label:"Crown",    color:"#4b5563", emoji:"◆" },
  rct:      { fill:"#4C1D95", stroke:"#A78BFA", label:"RCT",      color:"#7c3aed", emoji:"✚" },
  missing:  { fill:"#1C1917", stroke:"#57534E", label:"Missing",  color:"#78716c", emoji:"✕" },
  implant:  { fill:"#064E3B", stroke:"#34D399", label:"Implant",  color:"#059669", emoji:"⊕" },
  bridge:   { fill:"#7C2D12", stroke:"#FB923C", label:"Bridge",   color:"#ea580c", emoji:"⊂⊃"},
  planned:  { fill:"#713F12", stroke:"#FCD34D", label:"Planned",  color:"#d97706", emoji:"◉" },
  pain:     { fill:"#881337", stroke:"#FB7185", label:"Pain",     color:"#e11d48", emoji:"!" },
};

// ── Precise anatomical SVG paths for each tooth type ─────────────────────────
// Professional dental chart style - each tooth has crown + root(s)
// Paths drawn to match real clinical dental chart standards

const TOOTH_SHAPES = {

  // ── UPPER TEETH (crown below, roots above) ────────────────────────────────

  upper_central: (fill, stroke, sw) => (
    <svg viewBox="0 0 60 110" width="100%" height="100%">
      {/* Root - single tapered */}
      <path d="M 22,0 C 20,0 18,4 18,16 C 18,30 20,42 24,50 C 26,54 28,56 30,56 C 32,56 34,54 36,50 C 40,42 42,30 42,16 C 42,4 40,0 38,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      {/* Crown - wide rectangular with rounded incisal */}
      <path d="M 8,56 C 6,56 4,58 4,62 L 4,90 C 4,96 8,104 16,107 C 20,109 25,110 30,110 C 35,110 40,109 44,107 C 52,104 56,96 56,90 L 56,62 C 56,58 54,56 52,56 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Mamelons - incisal edge detail */}
      <path d="M 14,107 L 14,102 M 25,109 L 25,104 M 36,109 L 36,104 M 46,107 L 46,102"
        stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      {/* Mesial contact */}
      <path d="M 4,72 C 4,68 6,66 8,66" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.5"/>
      {/* Distal contact */}
      <path d="M 56,72 C 56,68 54,66 52,66" fill="none" stroke={stroke} strokeWidth="0.8" opacity="0.5"/>
      {/* Enamel highlight */}
      <path d="M 12,65 C 14,62 20,60 26,61" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  upper_lateral: (fill, stroke, sw) => (
    <svg viewBox="0 0 52 108" width="100%" height="100%">
      <path d="M 20,0 C 18,0 16,4 16,15 C 16,28 18,40 22,48 C 24,52 27,54 26,54 C 25,54 28,52 30,48 C 34,40 36,28 36,15 C 36,4 34,0 32,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 7,54 C 5,54 3,56 3,60 L 3,86 C 3,93 7,101 15,104 C 19,106 23,107 26,107 C 29,107 33,106 37,104 C 45,101 49,93 49,86 L 49,60 C 49,56 47,54 45,54 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M 12,104 L 12,100 M 23,106 L 23,102 M 33,106 L 33,102 M 40,104 L 40,100"
        stroke={stroke} strokeWidth="1.2" opacity="0.4"/>
      <path d="M 10,63 C 12,60 18,58 23,59" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  upper_canine: (fill, stroke, sw) => (
    <svg viewBox="0 0 52 120" width="100%" height="100%">
      {/* Long single root */}
      <path d="M 20,0 C 18,0 15,5 14,20 C 13,36 15,54 18,62 C 20,68 23,70 26,70 C 29,70 32,68 34,62 C 37,54 39,36 38,20 C 37,5 34,0 32,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      {/* Crown - pointed cusp */}
      <path d="M 8,70 C 6,70 4,72 4,76 L 4,100 C 4,106 8,113 16,116 C 20,118 23,119 26,120 C 29,119 32,118 36,116 C 44,113 48,106 48,100 L 48,76 C 48,72 46,70 44,70 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Canine cusp tip - distinctive pointed ridge */}
      <path d="M 26,119 L 24,115 L 26,112 L 28,115 Z" fill={stroke} opacity="0.3"/>
      <path d="M 20,110 C 22,114 24,117 26,119 C 28,117 30,114 32,110" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5"/>
      <path d="M 10,80 C 12,77 18,75 23,76" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),

  upper_1premolar: (fill, stroke, sw) => (
    <svg viewBox="0 0 56 108" width="100%" height="100%">
      {/* Buccal root */}
      <path d="M 14,0 C 12,0 10,3 10,15 C 10,28 12,42 15,50 C 17,54 20,56 22,56 L 24,56 L 24,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      {/* Palatal root */}
      <path d="M 32,56 L 34,56 C 36,56 39,54 41,50 C 44,42 46,28 46,15 C 46,3 44,0 42,0 L 32,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      {/* Crown - bicuspid with 2 cusps */}
      <path d="M 4,56 C 2,56 1,58 1,62 L 1,82 C 1,90 5,100 14,105 C 18,107 22,108 28,108 C 34,108 38,107 42,105 C 51,100 55,90 55,82 L 55,62 C 55,58 54,56 52,56 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Central fissure - premolar characteristic */}
      <line x1="28" y1="58" x2="28" y2="78" stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      {/* Buccal cusp */}
      <path d="M 8,105 C 10,100 16,96 20,97" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.4"/>
      {/* Palatal cusp */}
      <path d="M 48,105 C 46,100 40,96 36,97" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.4"/>
      <path d="M 8,65 C 10,62 16,60 22,61" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  upper_2premolar: (fill, stroke, sw) => (
    <svg viewBox="0 0 54 106" width="100%" height="100%">
      {/* Single root (2nd premolar often has 1) */}
      <path d="M 19,0 C 17,0 15,3 15,14 C 15,27 17,40 20,48 C 22,52 25,54 27,54 C 29,54 32,52 34,48 C 37,40 39,27 39,14 C 39,3 37,0 35,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 3,54 C 1,54 0,57 0,61 L 0,80 C 0,88 4,98 13,103 C 17,105 22,106 27,106 C 32,106 37,105 41,103 C 50,98 54,88 54,80 L 54,61 C 54,57 53,54 51,54 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      <line x1="27" y1="56" x2="27" y2="76" stroke={stroke} strokeWidth="1.5" opacity="0.35"/>
      <path d="M 7,63 C 9,60 15,58 21,59" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  upper_1molar: (fill, stroke, sw) => (
    <svg viewBox="0 0 70 110" width="100%" height="100%">
      {/* 3 roots - mesiobuccal, distobuccal, palatal */}
      <path d="M 8,0 C 6,0 4,3 4,14 C 4,27 6,40 9,48 C 11,52 14,54 16,54 L 20,54 L 20,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 28,0 L 28,54 L 42,54 L 42,0 Z" fill="#E8D5B5" stroke="#C4A882" strokeWidth="1" opacity="0.8"/>
      <path d="M 50,54 L 54,54 C 56,54 59,52 61,48 C 64,40 66,27 66,14 C 66,3 64,0 62,0 L 50,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      {/* Wide crown - largest upper tooth */}
      <path d="M 1,54 C 0,54 0,57 0,62 L 0,84 C 0,94 5,104 16,108 C 22,110 28,110 35,110 C 42,110 48,110 54,108 C 65,104 70,94 70,84 L 70,62 C 70,57 70,54 69,54 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Oblique ridge - characteristic of upper 1st molar */}
      <path d="M 18,60 C 24,72 46,72 52,60" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.35"/>
      {/* Central fossa */}
      <path d="M 20,78 C 28,74 42,74 50,78" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.35"/>
      {/* H-fissure pattern */}
      <line x1="35" y1="60" x2="35" y2="88" stroke={stroke} strokeWidth="1.2" opacity="0.3"/>
      {/* 4 cusps */}
      <ellipse cx="18" cy="68" rx="6" ry="7" fill={stroke} opacity="0.08"/>
      <ellipse cx="52" cy="68" rx="6" ry="7" fill={stroke} opacity="0.08"/>
      <ellipse cx="18" cy="90" rx="6" ry="7" fill={stroke} opacity="0.08"/>
      <ellipse cx="52" cy="90" rx="6" ry="7" fill={stroke} opacity="0.08"/>
      {/* Carabelli cusp - unique to upper 1st molar */}
      <ellipse cx="8" cy="90" rx="4" ry="5" fill={stroke} opacity="0.12"/>
      <path d="M 6,64 C 8,61 15,59 22,60" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  upper_2molar: (fill, stroke, sw) => (
    <svg viewBox="0 0 66 108" width="100%" height="100%">
      <path d="M 8,0 C 6,0 4,3 4,13 C 4,26 6,38 9,46 C 11,50 14,52 16,52 L 20,52 L 20,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 28,0 L 28,52 L 40,52 L 40,0 Z" fill="#E8D5B5" stroke="#C4A882" strokeWidth="1" opacity="0.8"/>
      <path d="M 48,52 L 52,52 C 54,52 57,50 59,46 C 62,38 64,26 64,13 C 64,3 62,0 60,0 L 48,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 1,52 C 0,52 0,55 0,60 L 0,82 C 0,92 5,102 15,106 C 21,108 27,108 33,108 C 39,108 45,108 51,106 C 61,102 66,92 66,82 L 66,60 C 66,55 66,52 65,52 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M 16,58 C 22,70 44,70 50,58" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      <line x1="33" y1="58" x2="33" y2="86" stroke={stroke} strokeWidth="1.2" opacity="0.28"/>
      <ellipse cx="17" cy="66" rx="6" ry="7" fill={stroke} opacity="0.07"/>
      <ellipse cx="49" cy="66" rx="6" ry="7" fill={stroke} opacity="0.07"/>
      <ellipse cx="17" cy="88" rx="6" ry="7" fill={stroke} opacity="0.07"/>
      <ellipse cx="49" cy="88" rx="6" ry="7" fill={stroke} opacity="0.07"/>
      <path d="M 6,62 C 8,59 14,57 20,58" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),

  upper_wisdom: (fill, stroke, sw) => (
    <svg viewBox="0 0 60 100" width="100%" height="100%">
      {/* Fused roots - wisdom often has fused/variable roots */}
      <path d="M 16,0 C 14,0 12,4 12,15 C 12,28 14,40 17,48 C 19,52 22,54 24,54 L 36,54 C 38,54 41,52 43,48 C 46,40 48,28 48,15 C 48,4 46,0 44,0 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 2,54 C 0,54 0,57 0,62 L 0,78 C 0,88 4,96 12,99 C 17,100 22,100 30,100 C 38,100 43,100 48,99 C 56,96 60,88 60,78 L 60,62 C 60,57 60,54 58,54 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M 12,58 C 18,68 42,68 48,58" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.28"/>
      <line x1="30" y1="58" x2="30" y2="82" stroke={stroke} strokeWidth="1.2" opacity="0.25"/>
      <path d="M 6,62 C 8,59 14,57 20,58" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  // ── LOWER TEETH (crown above, roots below) ────────────────────────────────

  lower_central: (fill, stroke, sw) => (
    <svg viewBox="0 0 56 110" width="100%" height="100%">
      {/* Crown - narrow lower incisor */}
      <path d="M 6,0 C 4,0 3,4 3,8 L 3,44 C 3,50 7,55 15,57 C 19,58 23,58 28,58 C 33,58 37,58 41,57 C 49,55 53,50 53,44 L 53,8 C 53,4 52,0 50,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Incisal edge mamelons */}
      <path d="M 12,3 L 12,8 M 22,1 L 22,6 M 32,1 L 32,6 M 42,3 L 42,8"
        stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      {/* Single root - lower incisors often have compressed root */}
      <path d="M 18,58 C 16,58 14,62 14,72 C 14,86 16,98 20,106 C 22,109 25,110 28,110 C 31,110 34,109 36,106 C 40,98 42,86 42,72 C 42,62 40,58 38,58 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 10,8 C 12,5 18,3 24,4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),

  lower_lateral: (fill, stroke, sw) => (
    <svg viewBox="0 0 56 110" width="100%" height="100%">
      <path d="M 5,0 C 3,0 2,4 2,8 L 2,43 C 2,49 6,54 14,57 C 18,58 23,58 28,58 C 33,58 38,58 42,57 C 50,54 54,49 54,43 L 54,8 C 54,4 53,0 51,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M 11,3 L 11,8 M 22,1 L 22,6 M 32,1 L 32,6 M 43,3 L 43,8"
        stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      <path d="M 18,58 C 16,58 14,62 14,72 C 14,87 16,99 20,106 C 22,109 25,110 28,110 C 31,110 34,109 36,106 C 40,99 42,87 42,72 C 42,62 40,58 38,58 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 9,8 C 11,5 17,3 23,4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),

  lower_canine: (fill, stroke, sw) => (
    <svg viewBox="0 0 54 122" width="100%" height="100%">
      <path d="M 5,0 C 3,0 2,5 2,10 L 2,48 C 2,54 6,60 14,63 C 18,65 23,66 27,66 C 31,66 36,65 40,63 C 48,60 52,54 52,48 L 52,10 C 52,5 51,0 49,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* Canine cusp - single pointed tip */}
      <path d="M 19,2 C 21,0 25,0 27,0 C 29,0 33,0 35,2" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5"/>
      <path d="M 27,0 L 25,5 L 27,3 L 29,5 Z" fill={stroke} opacity="0.3"/>
      {/* Long root */}
      <path d="M 17,66 C 15,66 13,70 13,82 C 13,98 15,112 19,119 C 21,121 24,122 27,122 C 30,122 33,121 35,119 C 39,112 41,98 41,82 C 41,70 39,66 37,66 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 9,10 C 11,7 17,5 23,6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),

  lower_1premolar: (fill, stroke, sw) => (
    <svg viewBox="0 0 58 108" width="100%" height="100%">
      <path d="M 3,0 C 1,0 0,4 0,10 L 0,47 C 0,54 5,60 14,63 C 18,65 23,66 29,66 C 35,66 40,65 44,63 C 53,60 58,54 58,47 L 58,10 C 58,4 57,0 55,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* 2 cusps - buccal taller */}
      <path d="M 14,2 C 18,0 22,0 24,1" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5"/>
      <path d="M 36,4 C 38,2 42,2 44,4" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.4"/>
      <line x1="29" y1="2" x2="29" y2="22" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      <path d="M 17,66 C 15,66 13,70 13,80 C 13,94 15,104 19,109 C 21,111 25,112 29,112 C 33,112 37,111 39,109 C 43,104 45,94 45,80 C 45,70 43,66 41,66 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 7,10 C 9,7 15,5 21,6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  lower_2premolar: (fill, stroke, sw) => (
    <svg viewBox="0 0 58 108" width="100%" height="100%">
      <path d="M 2,0 C 0,0 0,4 0,10 L 0,46 C 0,53 5,59 13,62 C 18,64 23,65 29,65 C 35,65 40,64 45,62 C 53,59 58,53 58,46 L 58,10 C 58,4 58,0 56,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* 3 cusps possible on lower 2nd premolar */}
      <path d="M 14,3 C 17,1 21,0 23,1 M 35,1 C 37,0 41,1 44,3" fill="none" stroke={stroke} strokeWidth="1.2" opacity="0.4"/>
      <line x1="29" y1="2" x2="29" y2="22" stroke={stroke} strokeWidth="1.2" opacity="0.28"/>
      <path d="M 17,65 C 15,65 13,69 13,79 C 13,93 15,103 19,108 C 21,110 25,111 29,111 C 33,111 37,110 39,108 C 43,103 45,93 45,79 C 45,69 43,65 41,65 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 7,10 C 9,7 15,5 21,6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  lower_1molar: (fill, stroke, sw) => (
    <svg viewBox="0 0 72 110" width="100%" height="100%">
      <path d="M 1,0 C 0,4 0,10 0,46 L 0,56 C 0,64 5,72 16,76 C 22,78 28,78 36,78 C 44,78 50,78 56,76 C 67,72 72,64 72,56 L 72,46 C 72,10 72,4 71,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* 5 cusps - lower 1st molar characteristic */}
      <path d="M 8,4 C 12,1 18,0 22,1 M 50,1 C 54,0 60,1 64,4" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.4"/>
      {/* Y-shaped fissure pattern */}
      <path d="M 20,10 C 28,20 36,24 36,24 C 36,24 44,20 52,10" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      <line x1="36" y1="24" x2="36" y2="60" stroke={stroke} strokeWidth="1.5" opacity="0.3"/>
      {/* 5 cusp markers */}
      <ellipse cx="17" cy="18" rx="7" ry="8" fill={stroke} opacity="0.07"/>
      <ellipse cx="55" cy="18" rx="7" ry="8" fill={stroke} opacity="0.07"/>
      <ellipse cx="36" cy="60" rx="7" ry="8" fill={stroke} opacity="0.07"/>
      <ellipse cx="17" cy="58" rx="6" ry="7" fill={stroke} opacity="0.06"/>
      <ellipse cx="55" cy="58" rx="6" ry="7" fill={stroke} opacity="0.06"/>
      {/* 2 roots */}
      <path d="M 10,78 C 8,78 6,82 6,92 C 6,104 8,112 12,118 C 14,121 17,122 20,122 C 23,122 26,120 28,118 C 30,114 32,104 32,92 C 32,82 30,78 28,78 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 44,78 C 42,78 40,82 40,92 C 40,104 42,112 46,118 C 48,121 51,122 54,122 C 57,122 60,120 62,118 C 64,114 66,104 66,92 C 66,82 64,78 62,78 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 6,8 C 8,5 14,3 20,4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  lower_2molar: (fill, stroke, sw) => (
    <svg viewBox="0 0 70 108" width="100%" height="100%">
      <path d="M 1,0 C 0,4 0,10 0,44 L 0,54 C 0,62 5,70 15,74 C 21,76 27,76 35,76 C 43,76 49,76 55,74 C 65,70 70,62 70,54 L 70,44 C 70,10 70,4 69,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      {/* 4 cusps - lower 2nd molar */}
      <path d="M 18,8 C 24,18 34,22 35,22 C 36,22 46,18 52,8" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.28"/>
      <line x1="35" y1="22" x2="35" y2="58" stroke={stroke} strokeWidth="1.2" opacity="0.28"/>
      <line x1="4" y1="38" x2="66" y2="38" stroke={stroke} strokeWidth="1.2" opacity="0.28"/>
      <ellipse cx="16" cy="18" rx="7" ry="8" fill={stroke} opacity="0.06"/>
      <ellipse cx="54" cy="18" rx="7" ry="8" fill={stroke} opacity="0.06"/>
      <ellipse cx="16" cy="56" rx="7" ry="8" fill={stroke} opacity="0.06"/>
      <ellipse cx="54" cy="56" rx="7" ry="8" fill={stroke} opacity="0.06"/>
      <path d="M 8,76 C 6,76 4,80 4,90 C 4,102 6,110 10,116 C 12,119 15,120 18,120 C 21,120 24,118 26,116 C 28,112 30,102 30,90 C 30,80 28,76 26,76 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 44,76 C 42,76 40,80 40,90 C 40,102 42,110 46,116 C 48,119 51,120 54,120 C 57,120 60,118 62,116 C 64,112 66,102 66,90 C 66,80 64,76 62,76 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 5,8 C 7,5 13,3 19,4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),

  lower_wisdom: (fill, stroke, sw) => (
    <svg viewBox="0 0 64 100" width="100%" height="100%">
      <path d="M 1,0 C 0,4 0,10 0,40 L 0,50 C 0,58 4,66 14,70 C 19,72 25,72 32,72 C 39,72 45,72 50,70 C 60,66 64,58 64,50 L 64,40 C 64,10 64,4 63,0 Z"
        fill={fill} stroke={stroke} strokeWidth={sw}/>
      <path d="M 14,4 C 20,14 30,18 32,18 C 34,18 44,14 50,4" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.25"/>
      <line x1="32" y1="18" x2="32" y2="56" stroke={stroke} strokeWidth="1.2" opacity="0.25"/>
      <line x1="4" y1="34" x2="60" y2="34" stroke={stroke} strokeWidth="1.2" opacity="0.25"/>
      <path d="M 14,72 C 12,72 10,76 10,86 C 10,96 12,102 16,107 C 18,109 21,110 24,110 C 27,110 30,108 32,106 C 34,102 36,96 36,86 C 36,76 34,72 32,72 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 32,72 C 30,72 32,76 32,86 C 32,96 34,102 38,107 C 40,109 43,110 46,110 C 49,110 52,108 54,106 C 56,102 58,96 58,86 C 58,76 56,72 54,72 Z"
        fill="#E8D5B5" stroke="#C4A882" strokeWidth="1"/>
      <path d="M 5,8 C 7,5 13,3 18,4" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

// ── Tooth type resolver ────────────────────────────────────────────────────────
function getToothSVG(number, condition, isUpper, isSelected) {
  const cond = CONDITIONS[condition] || CONDITIONS.healthy;
  const isMissing = condition === "missing";
  const sw = isSelected ? "3" : "1.8";

  let shapeKey;
  const d = number % 10;
  const isWisdom = d === 8;
  const isMolarSecond = d === 7;
  const isMolarFirst = d === 6;
  const isPre1 = d === 4;
  const isPre2 = d === 5;
  const isCanine = d === 3;
  const isLateral = d === 2;

  if (isUpper) {
    if (d === 1) shapeKey = "upper_central";
    else if (d === 2) shapeKey = "upper_lateral";
    else if (d === 3) shapeKey = "upper_canine";
    else if (d === 4) shapeKey = "upper_1premolar";
    else if (d === 5) shapeKey = "upper_2premolar";
    else if (d === 6) shapeKey = "upper_1molar";
    else if (d === 7) shapeKey = "upper_2molar";
    else shapeKey = "upper_wisdom";
  } else {
    if (d === 1) shapeKey = "lower_central";
    else if (d === 2) shapeKey = "lower_lateral";
    else if (d === 3) shapeKey = "lower_canine";
    else if (d === 4) shapeKey = "lower_1premolar";
    else if (d === 5) shapeKey = "lower_2premolar";
    else if (d === 6) shapeKey = "lower_1molar";
    else if (d === 7) shapeKey = "lower_2molar";
    else shapeKey = "lower_wisdom";
  }

  const fill = isMissing ? CONDITIONS.missing.fill : cond.fill;
  const stroke = isMissing ? CONDITIONS.missing.stroke : cond.stroke;
  const fn = TOOTH_SHAPES[shapeKey];
  if (!fn) return null;
  return fn(fill, stroke, sw);
}

// ── Tooth number label ─────────────────────────────────────────────────────────
function ToothLabel({ number }) {
  return <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textAlign: "center", marginTop: 2 }}>{number}</div>;
}

// ── Single tooth component ─────────────────────────────────────────────────────
function Tooth({ number, condition, isUpper, width, height, onClick, isSelected }) {
  const cond = CONDITIONS[condition] || CONDITIONS.healthy;
  const isMissing = condition === "missing";

  return (
    <div onClick={onClick} title={`Tooth ${number} — ${cond.label}`}
      style={{
        width, display: "flex", flexDirection: "column",
        alignItems: "center", cursor: "pointer",
        position: "relative",
      }}>
      {/* Condition glow ring for non-healthy */}
      {!isMissing && condition !== "healthy" && (
        <div style={{
          position: "absolute", inset: -2, borderRadius: 6,
          boxShadow: `0 0 ${isSelected ? 12 : 6}px ${cond.color}`,
          pointerEvents: "none", zIndex: 0,
        }}/>
      )}
      {/* Selected highlight */}
      {isSelected && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: 6,
          border: `2px solid ${cond.color}`,
          pointerEvents: "none", zIndex: 1,
          boxShadow: `0 0 16px ${cond.color}88`,
        }}/>
      )}
      <div style={{
        width, height,
        transform: isSelected ? "scale(1.12)" : "scale(1)",
        transition: "transform 0.15s ease",
        position: "relative", zIndex: 2,
      }}>
        {getToothSVG(number, condition, isUpper, isSelected)}
      </div>
    </div>
  );
}

// ── Procedures list ────────────────────────────────────────────────────────────
const PROCS = [
  "Examination", "Periapical X-Ray", "Bitewing X-Ray", "Panoramic X-Ray",
  "Composite Filling — Class I", "Composite Filling — Class II",
  "Composite Filling — Class III", "Composite Filling — Class IV",
  "Amalgam Filling", "GIC Filling", "Temporary Filling",
  "Root Canal — Session 1", "Root Canal — Session 2", "Root Canal — Final",
  "Crown Preparation", "Crown Fit — Zirconia", "Crown Fit — PFM", "Crown Fit — Gold",
  "Extraction (Simple)", "Surgical Extraction", "Bone Graft",
  "Implant Placement", "Implant Abutment", "Implant Crown",
  "Scaling & Polishing", "Deep Scaling", "Subgingival Curettage",
  "Veneer Preparation", "Veneer Fitting", "Bleaching Session",
  "Bridge Preparation", "Bridge Fitting", "Space Maintainer",
  "Pulpotomy (Pediatric)", "Pulpectomy (Pediatric)", "Stainless Steel Crown",
  "Orthodontic Review", "Separators Placed", "Band & Loop",
];

// ── Tooth detail panel ─────────────────────────────────────────────────────────
function ToothPanel({ tooth, teethData, onSave, onClose }) {
  const t = teethData[tooth.number] || {};
  const [cond, setCond]   = useState(t.condition || "healthy");
  const [notes, setNotes] = useState(t.notes || "");
  const [proc, setProc]   = useState("");
  const [fee, setFee]     = useState("");
  const [lab, setLab]     = useState("");
  const [shade, setShade] = useState("");
  const condObj = CONDITIONS[cond] || CONDITIONS.healthy;

  const TOOTH_FULL_NAMES = {
    11:"Upper Right Central Incisor",12:"Upper Right Lateral Incisor",
    13:"Upper Right Canine",14:"Upper Right 1st Premolar",15:"Upper Right 2nd Premolar",
    16:"Upper Right 1st Molar",17:"Upper Right 2nd Molar",18:"Upper Right Wisdom",
    21:"Upper Left Central Incisor",22:"Upper Left Lateral Incisor",
    23:"Upper Left Canine",24:"Upper Left 1st Premolar",25:"Upper Left 2nd Premolar",
    26:"Upper Left 1st Molar",27:"Upper Left 2nd Molar",28:"Upper Left Wisdom",
    31:"Lower Left Central Incisor",32:"Lower Left Lateral Incisor",
    33:"Lower Left Canine",34:"Lower Left 1st Premolar",35:"Lower Left 2nd Premolar",
    36:"Lower Left 1st Molar",37:"Lower Left 2nd Molar",38:"Lower Left Wisdom",
    41:"Lower Right Central Incisor",42:"Lower Right Lateral Incisor",
    43:"Lower Right Canine",44:"Lower Right 1st Premolar",45:"Lower Right 2nd Premolar",
    46:"Lower Right 1st Molar",47:"Lower Right 2nd Molar",48:"Lower Right Wisdom",
  };

  const needsLab = proc && (proc.includes("Crown") || proc.includes("Bridge") || proc.includes("Veneer") || proc.includes("Implant Crown"));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", background: "rgba(2,6,23,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div style={{ marginLeft: "auto", width: 420, background: "#0f172a", display: "flex", flexDirection: "column", overflowY: "auto", boxShadow: "-20px 0 80px rgba(0,0,0,0.7)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${condObj.color}cc, ${condObj.color}55)`, padding: "24px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "rgba(255,255,255,0.7)" }}>FDI Tooth Number</p>
              <p style={{ margin: 0, fontSize: 56, fontWeight: 900, lineHeight: 1, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>{tooth.number}</p>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{TOOTH_FULL_NAMES[tooth.number] || `Tooth ${tooth.number}`}</p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
          </div>
          {/* Current condition */}
          <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.3)", borderRadius: 20, padding: "5px 14px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span style={{ fontSize: 14 }}>{condObj.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{condObj.label}</span>
          </div>
        </div>

        {/* Tooth preview */}
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 8px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ width: 80, height: 100 }}>
            {getToothSVG(tooth.number, cond, tooth.isUpper, false)}
          </div>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>

          {/* Condition */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#475569", margin: "0 0 10px" }}>Set Condition</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {Object.entries(CONDITIONS).map(([key, val]) => (
                <button key={key} onClick={() => setCond(key)}
                  style={{
                    background: cond === key ? `${val.color}20` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${cond === key ? val.color : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: "8px 10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    color: cond === key ? val.color : "#64748b",
                    fontSize: 11, fontWeight: 700,
                    transform: cond === key ? "scale(1.02)" : "scale(1)",
                    transition: "all 0.12s",
                  }}>
                  <span style={{ fontSize: 12 }}>{val.emoji}</span>{val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Procedure */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#475569", margin: "0 0 8px" }}>Today's Procedure</p>
            <select value={proc} onChange={e => setProc(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#f1f5f9", fontSize: 13, outline: "none", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="" style={{ background: "#1e293b" }}>— Select procedure —</option>
              {PROCS.map(p => <option key={p} value={p} style={{ background: "#1e293b" }}>{p}</option>)}
            </select>

            {proc && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div>
                  <p style={{ fontSize: 9, color: "#64748b", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Fee (JOD)</p>
                  <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
                </div>
                {needsLab && (
                  <div>
                    <p style={{ fontSize: 9, color: "#64748b", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Shade</p>
                    <input type="text" value={shade} onChange={e => setShade(e.target.value)} placeholder="A2, B1..."
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
                  </div>
                )}
              </div>
            )}

            {needsLab && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>🏭 Lab Work Required</p>
                <input type="text" value={lab} onChange={e => setLab(e.target.value)} placeholder="Lab name..."
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #fbbf2444", background: "rgba(251,191,36,0.06)", color: "#fbbf24", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#475569", margin: "0 0 8px" }}>Clinical Notes</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Depth of caries, sensitivity response, probing depths, observations..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#f1f5f9", fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
          </div>

          {/* History */}
          {t.history?.length > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#475569", margin: "0 0 8px" }}>Tooth History</p>
              {t.history.map((h, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", marginBottom: 5, borderLeft: `3px solid ${CONDITIONS[h.condition || "healthy"]?.color || "#475569"}` }}>
                  <p style={{ margin: "0 0 2px", fontSize: 9, color: "#64748b", fontWeight: 700 }}>{h.date}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{h.proc}</p>
                  {h.fee && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#fbbf24" }}>{h.fee} JOD</p>}
                  {h.lab && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#f97316" }}>🏭 {h.lab}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <button onClick={() => onSave(tooth.number, cond, notes, proc, fee, lab, shade)}
            style={{ width: "100%", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.35)", letterSpacing: 0.5 }}>
            💾 Save Tooth Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main dental chart ──────────────────────────────────────────────────────────
const ADULT_UPPER = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const ADULT_LOWER = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const PEDO_UPPER  = [55,54,53,52,51,61,62,63,64,65];
const PEDO_LOWER  = [85,84,83,82,81,71,72,73,74,75];

export function DentalChartTab() {
  const [isPedo, setIsPedo]         = useState(false);
  const [selected, setSelected]     = useState(null);
  const [teeth, setTeeth]           = useState({
    36: { condition:"caries",  notes:"Deep mesial caries, pulp exposure possible", history:[{date:"12/01/2026",proc:"Periapical X-Ray",condition:"caries"}] },
    11: { condition:"crown",   notes:"Zirconia crown placed 2023",                 history:[{date:"05/03/2023",proc:"Crown Fit — Zirconia",fee:"280",condition:"crown",lab:"Advanced Dental Lab",shade:"A2"}] },
    46: { condition:"rct",     notes:"RCT session 2 completed, awaiting crown",    history:[{date:"20/11/2025",proc:"Root Canal — Session 1",condition:"rct"},{date:"04/12/2025",proc:"Root Canal — Session 2",condition:"rct"}] },
    18: { condition:"missing", notes:"Extracted June 2024",                        history:[{date:"10/06/2024",proc:"Extraction (Simple)",condition:"missing"}] },
    21: { condition:"filled",  notes:"Composite Class III, labial surface",        history:[{date:"14/08/2024",proc:"Composite Filling — Class III",fee:"60",condition:"filled"}] },
    14: { condition:"pain",    notes:"Sensitivity to cold, #14 thermal test +ve",  history:[] },
    48: { condition:"planned", notes:"Planned extraction, partially erupted",       history:[] },
  });

  const upper = isPedo ? PEDO_UPPER  : ADULT_UPPER;
  const lower = isPedo ? PEDO_LOWER  : ADULT_LOWER;

  // Tooth sizing per type
  function getSize(n, isUpper) {
    const d = n % 10;
    const widths  = { 1:54,2:50,3:50,4:56,5:54,6:68,7:64,8:58 };
    const heights = isUpper
      ? { 1:108,2:106,3:118,4:106,5:104,6:108,7:106,8:98 }
      : { 1:108,2:108,3:120,4:106,5:106,6:108,7:106,8:98 };
    return { w: widths[d]||54, h: heights[d]||106 };
  }

  function handleSave(num, cond, notes, proc, fee, lab, shade) {
    setTeeth(prev => ({
      ...prev,
      [num]: {
        condition: cond, notes,
        history: proc
          ? [{ date: new Date().toLocaleDateString("en-GB"), proc, fee, lab, shade, condition: cond }, ...(prev[num]?.history || [])]
          : (prev[num]?.history || []),
      }
    }));
    setSelected(null);
  }

  const counts = Object.values(teeth).reduce((a, t) => {
    if (t.condition && t.condition !== "healthy") a[t.condition] = (a[t.condition] || 0) + 1;
    return a;
  }, {});

  const totalAffected = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ background: "#020617", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif", color: "#f1f5f9", display: "flex", flexDirection: "column", userSelect: "none" }}>

      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "rgba(255,255,255,0.02)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, background: "linear-gradient(135deg,#38bdf8,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🦷 Clinical Dental Chart
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#334155" }}>FDI two-digit notation · Click any tooth to record</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
            {[[false,"Adult (32)","#0ea5e9"],[true,"Pediatric (20)","#ec4899"]].map(([v,l,c]) => (
              <button key={String(v)} onClick={() => setIsPedo(v)}
                style={{ background: isPedo===v ? c : "transparent", color: isPedo===v ? "#fff" : "#64748b", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", marginRight: 4 }}>Status:</span>
        {Object.entries(CONDITIONS).map(([key, val]) => (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 20,
            background: counts[key] ? `${val.color}18` : "rgba(255,255,255,0.03)",
            border: `1px solid ${counts[key] ? val.color+"55" : "rgba(255,255,255,0.06)"}`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: val.color, flexShrink: 0 }}/>
            <span style={{ fontSize: 10, fontWeight: counts[key] ? 700 : 400, color: counts[key] ? val.color : "#475569" }}>{val.label}</span>
            {counts[key] && <span style={{ background: val.color, color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 9, fontWeight: 900 }}>{counts[key]}</span>}
          </div>
        ))}
        {totalAffected > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
            {totalAffected} tooth{totalAffected > 1 ? "teeth" : ""} with conditions
          </span>
        )}
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, overflowX: "auto", padding: "20px 24px" }}>
        <div style={{
          background: "linear-gradient(180deg, rgba(14,165,233,0.04) 0%, rgba(99,102,241,0.03) 50%, rgba(14,165,233,0.04) 100%)",
          borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)",
          padding: "20px 12px", minWidth: 900,
          boxShadow: "inset 0 2px 20px rgba(14,165,233,0.05)",
        }}>

          {/* Direction labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.2)" }}/>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#334155" }}>Patient's Right</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 3, color: "#475569" }}>UPPER JAW — MAXILLA</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#334155" }}>Patient's Left</span>
              <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.2)" }}/>
            </div>
          </div>

          {/* UPPER teeth — roots at top, crowns at bottom */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 1, marginBottom: 0 }}>
            {upper.map(n => {
              const { w, h } = getSize(n, true);
              const cond = teeth[n]?.condition || "healthy";
              return (
                <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Tooth number={n} condition={cond} isUpper={true} width={w} height={h}
                    isSelected={selected?.number === n}
                    onClick={() => setSelected({ number: n, isUpper: true })}/>
                  <ToothLabel number={n}/>
                </div>
              );
            })}
          </div>

          {/* Gum line separator */}
          <div style={{ position: "relative", margin: "10px 0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 5, background: "linear-gradient(90deg, rgba(244,114,182,0.1), rgba(244,114,182,0.5), rgba(244,114,182,0.1))" }}/>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f472b4", opacity: 0.7 }}/>
              <span style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: 4, color: "#be185d", opacity: 0.7 }}>Gingival Line</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f472b4", opacity: 0.7 }}/>
            </div>
            <div style={{ flex: 1, height: 5, borderRadius: 5, background: "linear-gradient(90deg, rgba(244,114,182,0.1), rgba(244,114,182,0.5), rgba(244,114,182,0.1))" }}/>
          </div>

          {/* LOWER teeth — crowns at top, roots at bottom */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 1, marginTop: 0 }}>
            {lower.map(n => {
              const { w, h } = getSize(n, false);
              const cond = teeth[n]?.condition || "healthy";
              return (
                <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <ToothLabel number={n}/>
                  <Tooth number={n} condition={cond} isUpper={false} width={w} height={h}
                    isSelected={selected?.number === n}
                    onClick={() => setSelected({ number: n, isUpper: false })}/>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.2)" }}/>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#334155" }}>Patient's Right</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 3, color: "#475569" }}>LOWER JAW — MANDIBLE</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#334155" }}>Patient's Left</span>
              <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.2)" }}/>
            </div>
          </div>
        </div>

        {/* Chart summary */}
        {totalAffected > 0 && (
          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", padding: "14px 18px" }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#334155", margin: "0 0 10px" }}>
              Chart Summary
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(counts).map(([key, count]) => {
                const affected = Object.entries(teeth).filter(([, t]) => t.condition === key).map(([n]) => n);
                return (
                  <div key={key} style={{ background: `${CONDITIONS[key].color}14`, border: `1px solid ${CONDITIONS[key].color}44`, borderRadius: 10, padding: "6px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{CONDITIONS[key].emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: CONDITIONS[key].color }}>{count} · {CONDITIONS[key].label}</span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: "#475569" }}>
                      Teeth: {affected.join(", ")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: "#1e293b", marginTop: 14 }}>
          💡 Click any tooth to set condition, record procedure, add lab work and clinical notes
        </p>
      </div>

      {/* Tooth detail panel */}
      {selected && (
        <ToothPanel
          tooth={selected}
          teethData={teeth}
          onSave={handleSave}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
