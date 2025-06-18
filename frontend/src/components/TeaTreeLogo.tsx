import React from "react";

const TeaTreeLogo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Shadow */}
    <ellipse cx="32" cy="55" rx="14" ry="3" fill="#000" opacity="0.08" />

   
    {/* Cup body (squared with rounded bottom) */}
    <path
      d="M18 40 L18 50 Q20 60 32 60 Q44 60 46 50 L46 40 Z"
      fill="#D6BFA3"
      stroke="#000"
      strokeWidth="1"
    />

    {/* Cup rim */}
    <ellipse
      cx="32"
      cy="40"
      rx="14"
      ry="4"
      fill="#D6BFA3"
      stroke="#000"
      strokeWidth="1"
    />

    {/* Tea fill inside cup */}
    <ellipse
      cx="32"
      cy="41"
      rx="12"
      ry="2.5"
      fill="#A67C52"
      stroke="none"
/>

{/* String coming out of the teacup (top point moved right, curve reduced) */}
<path
  d="M23 43.5 Q20 49 22 54"
  stroke="#000000"
  strokeWidth="1.2"
  strokeLinecap="round"
  fill="none"
/>

    {/* Teabag tag */}
    <rect
      x="19"
      y="47"
      width="7"
      height="9"
      rx="1.5"
      fill="#B0B0B0"
      stroke="#000"
      strokeWidth="0.5"
    />








 {/* Stem (moved up, behind rim) */}
 <path
      d="M32 42.5 Q35 32 38 18"
      stroke="#4E342E"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    {/* Leaves */}
    {/* Upper left leaf */}
    <g transform="translate(34 30) rotate(-25)">
      <ellipse cx="0" cy="-8" rx="2.3" ry="9" fill="#5B6F56" stroke="#000" strokeWidth="0.4" />
      <path d="M0 -17 L0 0" stroke="#4E342E" strokeWidth="0.3" strokeLinecap="round" />
    </g>

    {/* Top center leaf */}
    <g transform="translate(38 22) rotate(0)">
      <ellipse cx="0" cy="-9" rx="2.5" ry="11" fill="#5B6F56" stroke="#000" strokeWidth="0.4" />
      <path d="M0 -19 L0 0" stroke="#4E342E" strokeWidth="0.3" strokeLinecap="round" />
    </g>

    {/* Upper right leaf */}
    <g transform="translate(38 25) rotate(40)">
      <ellipse cx="0" cy="-8" rx="2.3" ry="9" fill="#5B6F56" stroke="#000" strokeWidth="0.4" />
      <path d="M0 -17 L0 0" stroke="#4E342E" strokeWidth="0.3" strokeLinecap="round" />
    </g>

    {/* Lower left leaf */}
    <g transform="translate(33 38) rotate(-20)">
      <ellipse cx="0" cy="-6" rx="1.8" ry="7" fill="#5B6F56" stroke="#000" strokeWidth="0.35" />
      <path d="M0 -12 L0 0" stroke="#4E342E" strokeWidth="0.25" strokeLinecap="round" />
    </g>

    {/* Lower right leaf */}
    <g transform="translate(33 38) rotate(50)">
      <ellipse cx="0" cy="-6" rx="1.8" ry="7" fill="#5B6F56" stroke="#000" strokeWidth="0.35" />
      <path d="M0 -12 L0 0" stroke="#4E342E" strokeWidth="0.25" strokeLinecap="round" />
    </g>

    {/* Extra leaves near top */}
    <g transform="translate(36 24) rotate(-20)">
      <ellipse cx="0" cy="-7" rx="2" ry="8" fill="#5B6F56" stroke="#000" strokeWidth="0.35" />
      <path d="M0 -15 L0 0" stroke="#4E342E" strokeWidth="0.25" strokeLinecap="round" />
    </g>
    <g transform="translate(36 30) rotate(45)">
      <ellipse cx="0" cy="-7" rx="2" ry="8" fill="#5B6F56" stroke="#000" strokeWidth="0.35" />
      <path d="M0 -15 L0 0" stroke="#4E342E" strokeWidth="0.25" strokeLinecap="round" />
    </g>

    {/* Cup handle (refined, behind cup) */}
    <g>
      {/* Filled area between handle curves */}{/*
      <path
        d="
          M47 40 C51 39 55 42 55 48 C55 54 50 62 44 57
          L43.5 56
          C47 58 51 51 50 46
          C49 43 45 41 45.5 46
          Z
        "
        fill="#D6BFA3"
        fillOpacity="100"
        stroke="#000"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
       Outer handle outline */}
      {/* Filled handle area */}
      <path
        d="
          M46.5 40
          C49 39 53 42 53 48
          C53 54 48.5 62 42.5 57
          L44 55
          C48 58 51 51 50 46
          C49 43 45 41 46 44
          Z
        "
        fill="#D6BFA3"
        stroke="none"
      />
      {/* Hidden handle outlines */}
      <path
        d="M46 40 C49 39 53 42 53 48 C53 54 48 62 42.5 57"
        fill="none"
        stroke="#000"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner handle outline */}
      <path
        d="M46 44 C45 41 49 43 50 46 C51 51 48 58 44 55"
        fill="none"
        stroke="#000"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 1 }}
      />
    </g>

    {/* Steam wiggles above cup rim */}
    <path
      d="M21.5 36 Q23 33 20.5 31 Q18 29 19.5 27"
      stroke="#BBA16A"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      opacity="0.35"
    />
    <path
      d="M26.5 36 Q28 33 25.5 31 Q23 29 24.5 27"
      stroke="#BBA16A"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      opacity="0.35"
    />
    <path
      d="M31.5 36 Q33 33 30.5 31 Q28 29 29.5 27"
      stroke="#BBA16A"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      opacity="0.35"
    />
    <path
      d="M36.5 36 Q38 33 35.5 31 Q33 29 34.5 27"
      stroke="#BBA16A"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      opacity="0.35"
    />
    <path
      d="M41.5 36 Q43 33 40.5 31 Q38 29 39.5 27"
      stroke="#BBA16A"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      opacity="0.35"
    />
  </svg>
);

export default TeaTreeLogo; 