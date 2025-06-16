import React from "react";

const TeaTreeLogo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Foliage - monochrome blobs */}
    <ellipse cx="24" cy="22" rx="7" ry="6" fill="#222" />
    <ellipse cx="40" cy="22" rx="6" ry="5.5" fill="#444" />
    <ellipse cx="32" cy="15" rx="8.5" ry="7.5" fill="#666" />
    {/* Tree trunk - bold, stylized */}
    <rect x="30.5" y="24" width="3" height="18" rx="1.5" fill="#111" />
    {/* Branches - geometric lines */}
    <path d="M32 28 L26 20" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 28 L38 20" stroke="#111" strokeWidth="2" strokeLinecap="round" />
    <path d="M32 32 L24 26" stroke="#222" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M32 32 L40 26" stroke="#222" strokeWidth="1.5" strokeLinecap="round" />
    {/* Leaves - stylized ovals */}
    <ellipse cx="27" cy="19" rx="1.2" ry="2" fill="#111" opacity="0.7" />
    <ellipse cx="37" cy="19" rx="1.2" ry="2" fill="#111" opacity="0.7" />
    {/* Cup shadow - flat ellipse */}
    <ellipse cx="32" cy="52" rx="10" ry="2.2" fill="#111" opacity="0.10" />
    {/* Cup body - geometric, vector style */}
    <path d="M22 44 Q24 54, 32 54 Q40 54, 42 44 Q42 40, 22 44 Z" fill="#fff" stroke="#111" strokeWidth="2.2" />
    {/* Cup rim - bold ellipse */}
    <ellipse cx="32" cy="44" rx="10" ry="3.5" fill="#fff" stroke="#111" strokeWidth="2.2" />
    {/* Cup handle - geometric arc */}
    <path d="M42 46 Q48 48, 44 52 Q41 54, 40 48" stroke="#111" strokeWidth="2.2" fill="none" />
    {/* Cup base - flat ellipse */}
    <ellipse cx="32" cy="54" rx="6" ry="1.2" fill="#111" />
    {/* Subtle highlight on cup */}
    <ellipse cx="29" cy="48" rx="2.2" ry="0.7" fill="#bbb" opacity="0.7" />
    {/* Subtle shadow under rim */}
    <ellipse cx="32" cy="46.5" rx="7.5" ry="1.2" fill="#111" opacity="0.07" />
  </svg>
);

export default TeaTreeLogo; 