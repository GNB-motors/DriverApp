/* @ds-bundle: {"format":3,"namespace":"NovaSpiceKitDesignSystem_695efa","components":[],"sourceHashes":{"pos_redesign/components/icons.jsx":"f66bad7c16c5","pos_redesign/components/login-screens.jsx":"dc1fa02cb155","pos_redesign/components/pairing-directions.jsx":"ab3f0cb4a639","pos_redesign/components/pairing-shared.jsx":"c3db4d161e8b","pos_redesign/components/pos-home.jsx":"82ba17f8fd80","pos_redesign/data/home-data.js":"8dca6105fb7b","pos_redesign/design-canvas.jsx":"5d0e39003628","pos_redesign/workflows/components/landing-screens.jsx":"f8c307a8af23"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.NovaSpiceKitDesignSystem_695efa = window.NovaSpiceKitDesignSystem_695efa || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// pos_redesign/components/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// pos_redesign/components/icons.jsx
// Shared icon library — lean stroke set used throughout the POS.
// Each is a React functional component accepting className + size + any SVG prop.

const Icon = ({
  path,
  size = 20,
  children,
  ...p
}) => /*#__PURE__*/React.createElement("svg", _extends({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, p), children || /*#__PURE__*/React.createElement("path", {
  d: path
}));
window.Icons = {
  DineIn: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3v18M3 12h18",
    opacity: ".4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3",
    fill: "currentColor",
    stroke: "none"
  })),
  Takeout: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M6 7h12l-1 13H7L6 7z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 7V5a3 3 0 0 1 6 0v2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 11v5M15 11v5"
  })),
  Orders: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M8 2h8l4 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 12h6M9 16h6M9 8h2"
  })),
  Online: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "7",
    width: "14",
    height: "10",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 10h3l3 3v4h-6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "19",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "19",
    r: "2"
  })),
  Bell: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.73 21a2 2 0 0 1-3.46 0"
  })),
  Settings: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 12a7 7 0 0 0-.12-1.3l2-1.55-2-3.46-2.4.96a7 7 0 0 0-2.27-1.31L14 3h-4l-.21 2.34a7 7 0 0 0-2.27 1.31l-2.4-.96-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .44.04.87.12 1.3l-2 1.55 2 3.46 2.4-.96a7 7 0 0 0 2.27 1.31L10 21h4l.21-2.34a7 7 0 0 0 2.27-1.31l2.4.96 2-3.46-2-1.55c.08-.43.12-.86.12-1.3z"
  })),
  Plus: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14M5 12h14"
  })),
  Minus: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14"
  })),
  Close: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })),
  ChevDown: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })),
  ChevRight: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "m9 6 6 6-6 6"
  })),
  ArrowR: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M5 12h14M12 5l7 7-7 7"
  })),
  Users: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
  })),
  User: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })),
  Clock: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6v6l4 2"
  })),
  Search: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  Menu: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18M3 12h18M3 18h18"
  })),
  Grid: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  })),
  Transfer: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M17 3h4v4M21 3l-7 7M7 21H3v-4M3 21l7-7"
  })),
  Merge: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M8 21V10.5L3 6V3h18v3l-5 4.5V21"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 13h8"
  })),
  Print: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "14",
    width: "12",
    height: "8"
  })),
  Phone: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2z"
  })),
  Lock: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "11",
    width: "18",
    height: "11",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 11V7a5 5 0 0 1 10 0v4"
  })),
  AlertTri: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4M12 17h.01"
  })),
  MapPin: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "3"
  })),
  Tweak: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
  })),
  Check: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })),
  Dollar: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
  })),
  MoreH: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1"
  })),
  LogOut: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
  })),
  Pause: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "4",
    width: "4",
    height: "16"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "4",
    width: "4",
    height: "16"
  })),
  Coffee: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 1v3M10 1v3M14 1v3"
  })),
  FileText: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v6h6M16 13H8M16 17H8M10 9H8"
  })),
  Qr: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 5h3v3H5zM16 5h3v3h-3zM5 16h3v3H5zM14 14h2v2M18 14v2M14 18v3M18 18h3M20 20v1"
  })),
  Backspace: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M22 3H7a2 2 0 0 0-1.62.82L1 12l4.38 8.18A2 2 0 0 0 7 21h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m18 9-6 6M12 9l6 6"
  })),
  Wifi: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M5 12.55a11 11 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 20h.01M1.42 9a16 16 0 0 1 21.16 0"
  })),
  Battery: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "7",
    width: "18",
    height: "10",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 11v2",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "9",
    width: "12",
    height: "6",
    fill: "currentColor",
    stroke: "none"
  })),
  Building: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "2",
    width: "16",
    height: "20",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"
  })),
  Shield: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  })),
  Zap: p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
    d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z"
  }))
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/components/icons.jsx", error: String((e && e.message) || e) }); }

// pos_redesign/components/login-screens.jsx
try { (() => {
/* global React, Icons */
// pos_redesign/components/login-screens.jsx
// Login screen matching actual Nova POS layout:
// Tablet: photo+app-icon left, blue avatar + PIN dots + pill numpad right
// Handheld: photo card top, avatar + PIN + numpad below

const {
  useState,
  useEffect
} = React;
const Ic = window.Icons;

// ─── Blue user avatar ──────────────────────────────────────────
function UserAvatar({
  size = 72
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "login-avatar",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.5,
    height: size * 0.5,
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 21a8 8 0 0 0-16 0"
  })));
}

// ─── PIN dots (4 digits) ───────────────────────────────────────
function PinDots({
  value = '',
  length = 4,
  error = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "login-pin-dots"
  }, Array.from({
    length
  }).map((_, i) => {
    const filled = i < value.length;
    const isActive = !error && !filled && i === value.length;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "login-pin-dot",
      "data-filled": filled || undefined,
      "data-error": error && filled || undefined,
      "data-active": isActive || undefined
    });
  }));
}

// ─── Numpad — pill/stadium buttons ─────────────────────────────
function Numpad({
  onPress,
  onBack
}) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return /*#__PURE__*/React.createElement("div", {
    className: "login-numpad"
  }, keys.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: "login-numkey",
    onClick: () => onPress?.(k)
  }, k)), /*#__PURE__*/React.createElement("div", {
    className: "login-numkey",
    "data-empty": true
  }), /*#__PURE__*/React.createElement("button", {
    className: "login-numkey",
    onClick: () => onPress?.(0)
  }, "0"), /*#__PURE__*/React.createElement("button", {
    className: "login-numkey",
    "data-back": true,
    onClick: onBack,
    "aria-label": "Backspace"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "9",
    x2: "12",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "18",
    y2: "15"
  }))));
}

// ─── Order Notification Bar ────────────────────────────────────
function OrderNotifBar({
  count = 3,
  expanded = false,
  orders = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "login-notif",
    "data-expanded": expanded
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-notif-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-notif-icon"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.73 21a2 2 0 01-3.46 0"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "login-notif-text"
  }, count, " new order", count > 1 ? 's' : '', expanded && /*#__PURE__*/React.createElement("small", null, "Enter PIN to unlock & manage")), /*#__PURE__*/React.createElement("button", {
    className: "login-notif-btn"
  }, expanded ? 'Close' : 'View')), expanded && /*#__PURE__*/React.createElement("div", {
    className: "login-notif-list"
  }, orders.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "login-notif-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-notif-row-platform",
    style: {
      background: o.color,
      color: '#fff'
    }
  }, o.platform), /*#__PURE__*/React.createElement("div", {
    className: "login-notif-row-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-notif-row-title"
  }, o.customer, " \xB7 #", o.id), /*#__PURE__*/React.createElement("div", {
    className: "login-notif-row-meta"
  }, o.items, " \xB7 ", o.time)), /*#__PURE__*/React.createElement("div", {
    className: "login-notif-row-amt"
  }, "$", o.amount)))));
}
const SAMPLE_ORDERS = [{
  platform: 'UE',
  color: '#000',
  customer: 'Maya R.',
  id: 'A2841',
  items: '3 items',
  time: '2 min ago',
  amount: '42.80'
}, {
  platform: 'DD',
  color: '#FF3008',
  customer: 'Theo W.',
  id: 'A2840',
  items: '5 items',
  time: '4 min ago',
  amount: '67.25'
}, {
  platform: 'GH',
  color: '#FF8000',
  customer: 'Ariel S.',
  id: 'A2839',
  items: '2 items',
  time: '7 min ago',
  amount: '24.10'
}];

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN — full screen, configurable
// ═══════════════════════════════════════════════════════════════
function LoginScreen({
  form = 'tablet',
  // 'tablet' | 'handheld'
  initialState = 'idle',
  // 'idle' | 'typing' | 'error' | 'syncing' | 'face' | 'cashdrawer'
  initialPin = '',
  notifMode = 'none' // 'none' | 'collapsed' | 'expanded'
}) {
  const [state] = useState(initialState);
  const [pin, setPin] = useState(initialPin);
  const [mode] = useState(initialState === 'face' ? 'face' : 'pin');
  const isError = state === 'error';
  const isSyncing = state === 'syncing';
  const isCashDrawer = state === 'cashdrawer';
  const isHH = form === 'handheld';
  const press = k => setPin(p => (p + k).slice(0, 4));
  const back = () => setPin(p => p.slice(0, -1));
  return /*#__PURE__*/React.createElement("div", {
    className: "login-root",
    "data-form": form
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-photo"
  }, /*#__PURE__*/React.createElement("img", {
    className: "login-photo-img",
    src: "../../assets/nova-hero.jpg",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "login-photo-overlay"
  }), /*#__PURE__*/React.createElement("div", {
    className: "login-app-icon"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/nova-app-icon.png",
    alt: "Nova"
  })), isHH && /*#__PURE__*/React.createElement("div", {
    className: "login-terminal-chip"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "3",
    width: "20",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 21h8M12 17v4"
  })), "CFD Test")), /*#__PURE__*/React.createElement("div", {
    className: "login-pin-panel"
  }, isSyncing && /*#__PURE__*/React.createElement("div", {
    className: "login-sync-bar"
  }), /*#__PURE__*/React.createElement("div", {
    className: "login-terminal-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dot"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "4",
    width: "20",
    height: "16",
    rx: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 8h4v3H7z",
    fill: "#fff"
  }))), /*#__PURE__*/React.createElement("span", null, "Terminal 1")), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, !isHH && /*#__PURE__*/React.createElement("div", {
    className: "device-chip"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "3",
    width: "20",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 21h8M12 17v4"
  })), "CFD Test"), /*#__PURE__*/React.createElement("div", {
    className: "time-block"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, "10:42 PM"), /*#__PURE__*/React.createElement("span", {
    className: "d"
  }, "Sun, Apr 2026")))), /*#__PURE__*/React.createElement("div", {
    className: "login-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login-input-area",
    style: {
      alignSelf: 'stretch',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(UserAvatar, {
    size: isHH ? 60 : 72
  }), mode === 'pin' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(PinDots, {
    value: pin,
    length: 4,
    error: isError
  }), isError && /*#__PURE__*/React.createElement("div", {
    className: "login-pin-error"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12.01",
    y2: "16"
  })), "Invalid PIN. Try again.")), mode === 'face' && /*#__PURE__*/React.createElement("div", {
    className: "login-face"
  }, /*#__PURE__*/React.createElement("span", null, "Hold steady \u2014 scanning\u2026"))), mode === 'pin' && /*#__PURE__*/React.createElement("div", {
    className: "login-numpad-area",
    style: {
      alignSelf: 'stretch',
      width: '100%',
      paddingBottom: '16px'
    }
  }, /*#__PURE__*/React.createElement(Numpad, {
    onPress: press,
    onBack: back
  }), isCashDrawer && /*#__PURE__*/React.createElement("div", {
    className: "login-cd-actions"
  }, /*#__PURE__*/React.createElement("button", null, "Cancel"), /*#__PURE__*/React.createElement("button", {
    "data-confirm": true
  }, "Confirm")))), /*#__PURE__*/React.createElement("div", {
    className: "login-powered"
  }, "Powered by", /*#__PURE__*/React.createElement("img", {
    src: "../../assets/nova-app-icon.png",
    alt: ""
  }), /*#__PURE__*/React.createElement("strong", null, "Nova")), form === 'tablet' && notifMode !== 'none' && /*#__PURE__*/React.createElement(OrderNotifBar, {
    count: 3,
    expanded: notifMode === 'expanded',
    orders: SAMPLE_ORDERS
  })));
}
Object.assign(window, {
  LoginScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/components/login-screens.jsx", error: String((e && e.message) || e) }); }

// pos_redesign/components/pairing-directions.jsx
try { (() => {
/* global React, Icons, PinCells, PairingStatus, PairingError, Brand,
          StateSwitcher, QrCard, pinForState */
// pos_redesign/components/pairing-directions.jsx
// Three Pairing directions, each supporting tablet + handheld via the `form` prop.
// Props: { form: 'tablet' | 'handheld', theme?: 'light'|'dark', initialState?: string }

const {
  useState,
  useEffect
} = React;

// ═══════════════════════════════════════════════════════════════════
// DIRECTION A — Centered classic
// ═══════════════════════════════════════════════════════════════════
function PairingA({
  form = 'tablet',
  theme = 'light',
  initialState = 'idle'
}) {
  const [state, setState] = useState(initialState);
  const isHH = form === 'handheld';
  const pin = pinForState(state);
  const isWorking = ['verifying', 'authorizing', 'syncing'].includes(state);
  const isError = state === 'error';
  return /*#__PURE__*/React.createElement("div", {
    className: `pair-root pair-a ${isHH ? 'pair-compact' : ''}`,
    "data-theme": theme
  }, /*#__PURE__*/React.createElement(StateSwitcher, {
    state: state,
    setState: setState
  }), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement(Brand, {
    subtitle: "Point of Sale"
  }), /*#__PURE__*/React.createElement("div", {
    className: "headline"
  }, /*#__PURE__*/React.createElement("div", {
    className: "title"
  }, "Pair this terminal"), /*#__PURE__*/React.createElement("div", {
    className: "subtitle"
  }, "Enter the 6-character PIN from the RMS portal, or scan the QR shown there.")), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pin-label"
  }, "Pairing PIN"), /*#__PURE__*/React.createElement(PinCells, {
    value: pin,
    error: isError
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: isHH ? 44 : 52,
      display: 'flex',
      alignItems: 'center'
    }
  }, isWorking && /*#__PURE__*/React.createElement(PairingStatus, {
    state: state
  }), state === 'success' && /*#__PURE__*/React.createElement(PairingStatus, {
    state: "success"
  }), isError && /*#__PURE__*/React.createElement(PairingError, {
    message: "Invalid PIN. Check the RMS portal and retry."
  }), !isWorking && !isError && state !== 'success' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--fg-tertiary)'
    }
  }, "e.g. HQ2W4Z \u2014 letters and numbers, no spaces.")), !isHH && /*#__PURE__*/React.createElement("div", {
    className: "options-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "option-label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, "PIN entry is above")), /*#__PURE__*/React.createElement("div", {
    className: "pair-or-v"
  }, /*#__PURE__*/React.createElement("span", null, "Or")), /*#__PURE__*/React.createElement("div", {
    className: "option-label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lbl"
  }, "Scan QR"), /*#__PURE__*/React.createElement(QrCard, null))), isHH && /*#__PURE__*/React.createElement(QrCard, null))), /*#__PURE__*/React.createElement("div", {
    className: "pair-footer"
  }, "Find your pairing PIN in the RMS portal \u2014", ' ', /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "open portal"), "."));
}

// ═══════════════════════════════════════════════════════════════════
// DIRECTION B — Split-screen hero
// ═══════════════════════════════════════════════════════════════════
function PairingB({
  form = 'tablet',
  theme = 'light',
  initialState = 'idle'
}) {
  const [state, setState] = useState(initialState);
  const [liveInput, setLiveInput] = useState('');
  const isHH = form === 'handheld';
  const basePin = pinForState(state);
  const pin = state === 'idle' ? liveInput : basePin;
  const isWorking = ['verifying', 'authorizing', 'syncing'].includes(state);
  const isError = state === 'error';
  const canSubmit = liveInput.length === 6 && !isWorking && state === 'idle';
  const press = ch => {
    if (state !== 'idle') return;
    setLiveInput(p => (p + ch).slice(0, 6));
  };
  const back = () => {
    if (state !== 'idle') return;
    setLiveInput(p => p.slice(0, -1));
  };
  const submit = () => {
    if (liveInput.length === 6) setState('verifying');
  };

  // Auto-advance the live flow: verifying → syncing → success → navigate to POS Home.
  // State changes driven by the StateSwitcher (e.g. jumping straight to 'success')
  // also navigate, so all paths converge on the home screen.
  useEffect(() => {
    if (state === 'verifying') {
      const t = setTimeout(() => setState('syncing'), 900);
      return () => clearTimeout(t);
    }
    if (state === 'syncing') {
      const t = setTimeout(() => setState('success'), 900);
      return () => clearTimeout(t);
    }
    if (state === 'success') {
      // Hold the green check for a beat, then navigate the top frame.
      // Only the live (idle-typed) flow navigates — preview states set via the
      // StateSwitcher should stay put so the artboard remains inspectable.
      if (liveInput.length === 6) {
        const t = setTimeout(() => {
          try {
            window.top.location.href = 'POS Home.html';
          } catch (_) {
            window.location.href = 'POS Home.html';
          }
        }, 700);
        return () => clearTimeout(t);
      }
    }
  }, [state, liveInput]);
  return /*#__PURE__*/React.createElement("div", {
    className: `pair-root pair-b ${isHH ? 'pair-compact' : ''}`,
    "data-theme": theme
  }, /*#__PURE__*/React.createElement(StateSwitcher, {
    state: state,
    setState: setState
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mark"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 40 40",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 9 L9 31 L13.5 31 L13.5 17.4 L26.5 31 L31 31 L31 9 L26.5 9 L26.5 22.6 L13.5 9 Z"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "word"
  }, "Nova POS")), /*#__PURE__*/React.createElement("div", {
    className: "hero-body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Welcome"), /*#__PURE__*/React.createElement("h1", {
    className: "heading"
  }, "One PIN, and this terminal joins your restaurant."), !isHH && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Pairing connects this device to your menu, staff, printers, and nightly reports. It takes about 30 seconds."), /*#__PURE__*/React.createElement("ul", {
    className: "bullets"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, /*#__PURE__*/React.createElement(Icons.Check, null)), "Menu, modifiers, and combos pulled fresh from the portal"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, /*#__PURE__*/React.createElement(Icons.Check, null)), "Printers, cash drawers, and CFDs auto-discover on Wi-Fi"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, /*#__PURE__*/React.createElement(Icons.Check, null)), "Staff PINs sync so servers can clock in immediately")))), !isHH && /*#__PURE__*/React.createElement("div", {
    className: "footer"
  }, "Terminal ID will be assigned once pairing completes.")), /*#__PURE__*/React.createElement("div", {
    className: "form-side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-inner"
  }, /*#__PURE__*/React.createElement("span", {
    className: "step"
  }, "Step 1 of 2 \xB7 Pairing"), /*#__PURE__*/React.createElement("h2", null, "Enter your pairing PIN"), !isHH && /*#__PURE__*/React.createElement("p", {
    className: "blurb"
  }, "Open the RMS portal \u2192 ", /*#__PURE__*/React.createElement("em", null, "Terminals \u2192 Add terminal"), ". Copy the 6-character PIN and type it below."), /*#__PURE__*/React.createElement("div", {
    className: "pin-block"
  }, /*#__PURE__*/React.createElement(PinCells, {
    value: pin,
    error: isError
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: 40,
      display: 'flex',
      alignItems: 'center'
    }
  }, isWorking && /*#__PURE__*/React.createElement(PairingStatus, {
    state: state
  }), state === 'success' && /*#__PURE__*/React.createElement(PairingStatus, {
    state: "success"
  }), isError && /*#__PURE__*/React.createElement(PairingError, {
    message: "Invalid PIN. Check the RMS portal and retry."
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-keypad"
  }, /*#__PURE__*/React.createElement(QwertyKeypad, {
    scale: isHH ? 'sm' : 'md',
    onPress: press,
    onBack: back,
    isWorking: isWorking,
    state: state
  })), /*#__PURE__*/React.createElement("button", {
    className: "primary-btn",
    onClick: submit,
    disabled: !canSubmit
  }, isWorking ? 'Pairing…' : state === 'success' ? 'Paired ✓' : 'Pair terminal', !isWorking && state !== 'success' && /*#__PURE__*/React.createElement(Icons.ArrowR, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "ghost-btn",
    type: "button"
  }, /*#__PURE__*/React.createElement(Icons.Qr, {
    size: 16
  }), " Scan QR instead"))));
}

// ── Shared QWERTY keypad component (used by Direction B + C) ──
// Full iOS-style keyboard with a 123/ABC mode-switch key.
// scale: 'md' (tablet) | 'sm' (handheld). All sizing via CSS.
function QwertyKeypad({
  scale = 'md',
  onPress,
  onBack,
  onSubmit,
  canSubmit,
  isWorking,
  state
}) {
  const [mode, setMode] = useState('abc'); // 'abc' | 'num'
  const abcRows = [['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M']];
  const numRows = [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'], ['.', ',', '?', '!', "'"]];
  const rows = mode === 'abc' ? abcRows : numRows;
  const disabled = isWorking || state === 'success';
  return /*#__PURE__*/React.createElement("div", {
    className: `qwerty-keypad qwerty-${scale}`,
    role: "group",
    "aria-label": "PIN keyboard"
  }, rows.map((row, rIdx) => /*#__PURE__*/React.createElement("div", {
    key: rIdx,
    className: "qk-row",
    "data-row": rIdx
  }, row.map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: "qk-key",
    onClick: () => onPress(k),
    disabled: disabled
  }, k)))), /*#__PURE__*/React.createElement("div", {
    className: "qk-row qk-action"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qk-key qk-mode",
    onClick: () => setMode(mode === 'abc' ? 'num' : 'abc'),
    "aria-label": "Switch keyboard mode"
  }, mode === 'abc' ? '123' : 'ABC'), /*#__PURE__*/React.createElement("div", {
    className: "qk-spacer",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("button", {
    className: "qk-key qk-back",
    onClick: onBack,
    "aria-label": "Backspace",
    disabled: disabled
  }, /*#__PURE__*/React.createElement(Icons.Backspace, {
    size: scale === 'sm' ? 16 : 20
  }))));
}

// ═══════════════════════════════════════════════════════════════════
// DIRECTION C — Keypad-forward · switchable ABC / 123 modes, pill keys
// ═══════════════════════════════════════════════════════════════════
function PairingC({
  form = 'tablet',
  theme = 'light',
  initialState = 'idle'
}) {
  const [state, setState] = useState(initialState);
  const [liveInput, setLiveInput] = useState('');
  const isHH = form === 'handheld';
  const basePin = pinForState(state);
  const pin = state === 'idle' ? liveInput : basePin;
  const isWorking = ['verifying', 'authorizing', 'syncing'].includes(state);
  const isError = state === 'error';
  const press = ch => {
    if (state !== 'idle') return;
    setLiveInput(p => (p + ch).slice(0, 6));
  };
  const back = () => {
    if (state !== 'idle') return;
    setLiveInput(p => p.slice(0, -1));
  };
  const submit = () => {
    if (liveInput.length === 6) setState('verifying');
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `pair-root pair-c ${isHH ? 'pair-compact' : ''}`,
    "data-theme": theme
  }, /*#__PURE__*/React.createElement(StateSwitcher, {
    state: state,
    setState: setState
  }), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "content-section"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, /*#__PURE__*/React.createElement(Brand, {
    subtitle: "Terminal Setup"
  })), /*#__PURE__*/React.createElement("h2", null, "Pair this terminal with your\xA0restaurant."), !isHH && /*#__PURE__*/React.createElement("p", {
    className: "blurb"
  }, "Enter the 6-character PIN from your RMS portal. Switch between ", /*#__PURE__*/React.createElement("strong", null, "123"), " and ", /*#__PURE__*/React.createElement("strong", null, "ABC"), " on the keyboard below."), /*#__PURE__*/React.createElement("div", {
    className: "pin-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pin-label"
  }, "Pairing PIN"), /*#__PURE__*/React.createElement(PinCells, {
    value: pin,
    error: isError
  })), /*#__PURE__*/React.createElement("div", {
    className: "status-row"
  }, isWorking && /*#__PURE__*/React.createElement(PairingStatus, {
    state: state
  }), state === 'success' && /*#__PURE__*/React.createElement(PairingStatus, {
    state: "success"
  }), isError && /*#__PURE__*/React.createElement(PairingError, {
    message: "Invalid PIN. Try again."
  }), !isWorking && !isError && state !== 'success' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--fg-tertiary)'
    }
  }, pin.length, "/6 characters entered"))), /*#__PURE__*/React.createElement("div", {
    className: "action-leg"
  }, /*#__PURE__*/React.createElement("button", {
    className: "qr-link",
    type: "button"
  }, /*#__PURE__*/React.createElement(Icons.Qr, null), " Scan QR instead"), /*#__PURE__*/React.createElement("button", {
    className: "pair-cta",
    onClick: submit,
    disabled: liveInput.length < 6 || isWorking || state !== 'idle'
  }, isWorking ? 'Pairing…' : state === 'success' ? 'Paired ✓' : 'Pair terminal', !isWorking && state !== 'success' && /*#__PURE__*/React.createElement(Icons.ArrowR, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "keypad-section"
  }, /*#__PURE__*/React.createElement(QwertyKeypad, {
    scale: isHH ? 'sm' : 'md',
    onPress: press,
    onBack: back,
    isWorking: isWorking,
    state: state
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pair-footer"
  }, "Find your pairing PIN in the RMS portal \u2014", ' ', /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "open portal"), "."));
}
Object.assign(window, {
  PairingA,
  PairingB,
  PairingC
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/components/pairing-directions.jsx", error: String((e && e.message) || e) }); }

// pos_redesign/components/pairing-shared.jsx
try { (() => {
/* global React, Icons */
// pos_redesign/components/pairing-shared.jsx
// Shared building blocks for all three Pairing directions.

const {
  useState,
  useMemo
} = React;

// ─── PIN cells (6 slotted characters) ─────────────────────────────
function PinCells({
  value = '',
  error = false,
  activeIndex,
  maxLen = 6
}) {
  const chars = value.padEnd(maxLen, ' ').split('').slice(0, maxLen);
  // default active cell = first empty slot
  const defaultActive = value.length < maxLen ? value.length : -1;
  const active = activeIndex != null ? activeIndex : defaultActive;
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-pin-grid",
    role: "group",
    "aria-label": "PIN entry"
  }, chars.map((c, i) => {
    const filled = c.trim() !== '';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "pair-pin-cell",
      "data-filled": filled,
      "data-active": i === active && !error,
      "data-error": error
    }, filled ? c : '');
  }));
}

// ─── Progress / status line (spinner + text) ──────────────────────
const STATUS_TEXT = {
  verifying: 'Verifying PIN…',
  authorizing: 'Authorizing terminal…',
  syncing: 'Syncing menu & staff…',
  connecting: 'Connecting…',
  ready: 'Paired. Launching POS…'
};
function PairingStatus({
  state
}) {
  if (state === 'success') {
    return /*#__PURE__*/React.createElement("div", {
      className: "pair-success"
    }, /*#__PURE__*/React.createElement(Icons.Check, {
      size: 16
    }), " ", STATUS_TEXT.ready);
  }
  const label = STATUS_TEXT[state] || STATUS_TEXT.connecting;
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-progress",
    role: "status",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("span", {
    className: "spinner",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, label));
}
function PairingError({
  message
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-error-banner"
  }, /*#__PURE__*/React.createElement(Icons.AlertTri, {
    size: 16
  }), " ", message);
}

// ─── Brand lockup ─────────────────────────────────────────────────
function NovaMark({
  size = 26
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 40 40",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 9 L9 31 L13.5 31 L13.5 17.4 L26.5 31 L31 31 L31 9 L26.5 9 L26.5 22.6 L13.5 9 Z"
  }));
}
function Brand({
  subtitle = 'Point of Sale'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mark"
  }, /*#__PURE__*/React.createElement(NovaMark, null)), /*#__PURE__*/React.createElement("div", {
    className: "word"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Nova"), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, subtitle)));
}

// ─── Minimal status rail at the top of the artboard ──────────────
function ArtboardStatusBar({
  time = '10:42 AM',
  variant = 'light'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-statusbar"
  }, /*#__PURE__*/React.createElement("span", null, time), /*#__PURE__*/React.createElement("span", {
    className: "sb-right"
  }, /*#__PURE__*/React.createElement(Icons.Wifi, null), " ", /*#__PURE__*/React.createElement(Icons.Battery, null)));
}

// ─── State switcher shown on each artboard so you can preview states
function StateSwitcher({
  state,
  setState
}) {
  const OPTS = [['idle', 'Idle'], ['typing', 'Typing'], ['verifying', 'Verify'], ['syncing', 'Sync'], ['error', 'Error'], ['success', 'Done']];
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-state-chip",
    role: "tablist",
    "aria-label": "Preview state"
  }, OPTS.map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    "aria-selected": state === k,
    onClick: () => setState(k)
  }, label)));
}

// ─── QR scan card (used by direction A) ──────────────────────────
function QrCard() {
  return /*#__PURE__*/React.createElement("div", {
    className: "pair-qr-card",
    role: "button",
    tabIndex: "0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qr-icon"
  }, /*#__PURE__*/React.createElement(Icons.Qr, {
    size: 48
  })), /*#__PURE__*/React.createElement("span", {
    className: "qr-label"
  }, "Scan QR code"), /*#__PURE__*/React.createElement("span", {
    className: "qr-sub"
  }, "Aim at the RMS portal"));
}

// ─── Demo PIN logic — state drives what PinCells show ────────────
function pinForState(state) {
  switch (state) {
    case 'idle':
      return '';
    case 'typing':
      return 'HQ2';
    case 'verifying':
      return 'HQ2W4Z';
    case 'authorizing':
      return 'HQ2W4Z';
    case 'syncing':
      return 'HQ2W4Z';
    case 'error':
      return 'HQ2X99';
    case 'success':
      return 'HQ2W4Z';
    default:
      return '';
  }
}

// Export to window so direction files can use them
Object.assign(window, {
  PinCells,
  PairingStatus,
  PairingError,
  Brand,
  NovaMark,
  ArtboardStatusBar,
  StateSwitcher,
  QrCard,
  pinForState,
  STATUS_TEXT
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/components/pairing-shared.jsx", error: String((e && e.message) || e) }); }

// pos_redesign/components/pos-home.jsx
try { (() => {
// pos_redesign/components/pos-home.jsx
// POS Home screen — responsive across tablet-landscape, tablet-portrait, handheld.
// Uses POS_DATA (window.POS_DATA) for mocked tables/floors.

const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const Ic = window.Icons;

// ─── Helpers ─────────────────────────────────────────────────────────────
const fmtMoney = n => n === 0 ? '—' : `$${n.toFixed(2)}`;
const STATUS_LABEL = {
  available: 'Open',
  seated: 'Seated',
  ordered: 'Ordered',
  ready: 'Ready to pay',
  attention: 'Attention'
};

// ─── Nav tabs — "Quick order" collapsed into the "Quick sale" primary action.
const NAV_TABS = [{
  id: 'dinein',
  label: 'Dine-in',
  icon: Ic.DineIn
}, {
  id: 'orders',
  label: 'Orders',
  icon: Ic.Orders,
  badgeKey: 'activeOrderCount'
}, {
  id: 'online',
  label: 'Online',
  icon: Ic.Online,
  badgeKey: 'onlineOrderCount'
}];

// ─── Header ──────────────────────────────────────────────────────────────
function PosHeader({
  form,
  activeTab,
  onTab,
  onOpenEmployeeSheet,
  onOpenApprovals,
  pendingApprovals,
  activeOrders,
  onlineOrders
}) {
  const isHH = form === 'handheld';
  const isPortrait = form === 'portrait';
  // Narrow headers (portrait + handheld) use the bottom nav for tabs instead
  const showCenterTabs = !isHH && !isPortrait;
  return /*#__PURE__*/React.createElement("header", {
    className: "pos-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pos-rest-avatar"
  }, "NT"), !isHH && /*#__PURE__*/React.createElement("div", {
    className: "pos-rest-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "Nova Test Restaurant"), !isPortrait && /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Portland Westside \xB7 Terminal 02")), showCenterTabs && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'center',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pos-tabs",
    role: "tablist"
  }, NAV_TABS.map(tab => {
    const count = tab.badgeKey === 'activeOrderCount' ? activeOrders : tab.badgeKey === 'onlineOrderCount' ? onlineOrders : 0;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      className: "pos-tab",
      role: "tab",
      "aria-selected": activeTab === tab.id,
      onClick: () => onTab(tab.id)
    }, /*#__PURE__*/React.createElement(tab.icon, {
      className: "icon",
      size: 16
    }), /*#__PURE__*/React.createElement("span", null, tab.label), count > 0 && /*#__PURE__*/React.createElement("span", {
      className: "badge"
    }, count));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pos-right-cluster"
  }, !isHH && /*#__PURE__*/React.createElement("button", {
    className: "pos-quick-sale",
    onClick: () => onTab('takeout')
  }, /*#__PURE__*/React.createElement(Ic.Plus, {
    size: 16
  }), " Quick Order"), /*#__PURE__*/React.createElement("button", {
    className: "pos-icon-btn",
    onClick: onOpenApprovals,
    title: "Pending approvals"
  }, /*#__PURE__*/React.createElement(Ic.Bell, {
    size: 18
  }), pendingApprovals > 0 && /*#__PURE__*/React.createElement("span", {
    className: "notif-count"
  }, pendingApprovals)), !isHH && /*#__PURE__*/React.createElement("button", {
    className: "pos-icon-btn",
    title: "Device settings"
  }, /*#__PURE__*/React.createElement(Ic.Settings, {
    size: 18
  })), /*#__PURE__*/React.createElement("button", {
    className: "pos-emp-chip",
    onClick: onOpenEmployeeSheet
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "AR"), /*#__PURE__*/React.createElement("span", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, "Ana Rivera"), /*#__PURE__*/React.createElement("span", {
    className: "sh"
  }, "Shift \xB7 4h 12m")), /*#__PURE__*/React.createElement(Ic.ChevDown, {
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "pos-lock-btn",
    title: "Lock terminal",
    "aria-label": "Lock terminal"
  }, /*#__PURE__*/React.createElement(Ic.Lock, {
    size: 20
  }))));
}

// ─── Floor-chip row ──────────────────────────────────────────────────────
function FloorRow({
  floors,
  selectedFloor,
  onSelect,
  stats,
  form
}) {
  const isHH = form === 'handheld';
  return /*#__PURE__*/React.createElement("div", {
    className: "pos-floor-row"
  }, floors.map(f => {
    const c = stats[f.id] || {};
    return /*#__PURE__*/React.createElement("button", {
      key: f.id,
      className: "pos-floor-chip",
      "aria-selected": selectedFloor === f.id,
      onClick: () => onSelect(f.id)
    }, /*#__PURE__*/React.createElement("span", null, f.name), /*#__PURE__*/React.createElement("span", {
      className: "count"
    }, c.active, "/", c.total));
  }), !isHH && /*#__PURE__*/React.createElement("div", {
    className: "pos-floor-spacer"
  }), !isHH && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "pos-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: 'var(--pos-available)'
    }
  }), " Open"), /*#__PURE__*/React.createElement("span", {
    className: "pos-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: 'var(--pos-ordered)'
    }
  }), " Ordered"), /*#__PURE__*/React.createElement("span", {
    className: "pos-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: 'var(--pos-ready)'
    }
  }), " Ready"), /*#__PURE__*/React.createElement("span", {
    className: "pos-stat"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: 'var(--pos-attention)'
    }
  }), " Attention")));
}

// ─── Floor canvas + table tiles ──────────────────────────────────────────
function FloorCanvas({
  tables,
  selectedId,
  onSelect,
  form
}) {
  // Canvas natural bounds: derive from table extents
  const bounds = useMemo(() => {
    let maxX = 0,
      maxY = 0;
    tables.forEach(t => {
      maxX = Math.max(maxX, t.x + t.w);
      maxY = Math.max(maxY, t.y + t.h);
    });
    return {
      w: maxX + 40,
      h: maxY + 40
    };
  }, [tables]);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Fit to container (only scale down, never up above 1)
  useEffect(() => {
    const fit = () => {
      const el = canvasRef.current;
      if (!el) return;
      const {
        clientWidth,
        clientHeight
      } = el;
      const sx = clientWidth / bounds.w;
      const sy = clientHeight / bounds.h;
      const s = Math.min(sx, sy, 1);
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [bounds.w, bounds.h]);
  const offsetX = Math.max(0, (canvasRef.current?.clientWidth || 0) - bounds.w * scale) / 2;
  const offsetY = Math.max(0, (canvasRef.current?.clientHeight || 0) - bounds.h * scale) / 2;
  return /*#__PURE__*/React.createElement("div", {
    className: "pos-floor-canvas",
    ref: canvasRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "pos-floor-scaler",
    style: {
      width: bounds.w,
      height: bounds.h,
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
      transformOrigin: '0 0'
    }
  }, tables.map(t => /*#__PURE__*/React.createElement(TableTile, {
    key: t.id,
    t: t,
    selected: selectedId === t.id,
    onSelect: onSelect
  }))));
}
function TableTile({
  t,
  selected,
  onSelect
}) {
  const isCircle = t.shape === 'circle';
  return /*#__PURE__*/React.createElement("div", {
    className: "pos-table",
    "data-status": t.status,
    "data-selected": selected,
    style: {
      left: t.x,
      top: t.y,
      width: t.w,
      height: t.h,
      borderRadius: isCircle ? '50%' : 10
    },
    onClick: () => onSelect(t.id)
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "t-name"
  }, t.name), /*#__PURE__*/React.createElement("div", {
    className: "t-guests"
  }, /*#__PURE__*/React.createElement(Ic.Users, {
    size: 11
  }), t.guests > 0 ? `${t.guests}/${t.cap}` : `${t.cap} seats`)), t.orders.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      background: 'rgba(5,8,22,.06)',
      padding: '2px 5px',
      borderRadius: 4
    }
  }, "\xD7", t.orders.length)), t.status !== 'available' && /*#__PURE__*/React.createElement("div", {
    className: "t-bot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-status"
  }, STATUS_LABEL[t.status]), /*#__PURE__*/React.createElement("span", {
    className: "t-total"
  }, fmtMoney(t.orders.reduce((a, o) => a + (o.total || 0), 0)))), t.status === 'available' && /*#__PURE__*/React.createElement("div", {
    className: "t-bot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-status"
  }, STATUS_LABEL[t.status]), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--fg-tertiary)'
    }
  }, "Tap to seat")));
}

// ─── Table inspector (drawer/sheet) ──────────────────────────────────────
function TableInspector({
  table,
  open,
  onClose,
  form
}) {
  const [guests, setGuests] = useState(table?.guests || 0);
  useEffect(() => {
    setGuests(table?.guests || 0);
  }, [table]);
  const isHH = form === 'handheld';
  if (!table) return null;
  const hasOrder = table.orders.length > 0;
  const totalAll = table.orders.reduce((a, o) => a + (o.total || 0), 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pos-inspector-scrim",
    "data-open": open,
    onClick: onClose
  }), /*#__PURE__*/React.createElement("aside", {
    className: "pos-inspector",
    "data-open": open
  }, /*#__PURE__*/React.createElement("div", {
    className: "pos-insp-grabber"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pos-insp-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-badge",
    "data-status": table.status
  }, table.name), /*#__PURE__*/React.createElement("div", {
    className: "t-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, table.name, " \xB7 ", STATUS_LABEL[table.status]), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, table.cap, " seats \xB7 ", table.waiter ? `${table.waiter}` : 'Unassigned', table.elapsed ? ` · ${table.elapsed}` : '')), /*#__PURE__*/React.createElement("button", {
    className: "pos-insp-close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Ic.Close, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pos-insp-body"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pos-section-label"
  }, "Guests"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pos-stepper"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setGuests(Math.max(0, guests - 1)),
    "aria-label": "Decrease"
  }, /*#__PURE__*/React.createElement(Ic.Minus, {
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, guests), /*#__PURE__*/React.createElement("button", {
    onClick: () => setGuests(Math.min(table.cap, guests + 1)),
    "aria-label": "Increase"
  }, /*#__PURE__*/React.createElement(Ic.Plus, {
    size: 16
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--fg-secondary)'
    }
  }, "of ", table.cap, " max"))), hasOrder && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pos-section-label"
  }, "Open checks \xB7 ", fmtMoney(totalAll)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, table.orders.map((o, idx) => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    className: "pos-order-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "or-status",
    style: {
      background: o.status === 'draft' ? 'var(--pos-seated)' : o.status === 'ready' ? 'var(--pos-ready)' : o.status === 'attention' ? 'var(--pos-attention)' : 'var(--pos-ordered)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "or-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "or-title"
  }, o.status === 'draft' ? 'Draft' : `Check ${idx + 1}`, o.isYou && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--nova-rage-600)',
      marginLeft: 6
    }
  }, "\xB7 You")), /*#__PURE__*/React.createElement("div", {
    className: "or-meta"
  }, o.items, " items \xB7 ", o.seats, " seat", o.seats !== 1 ? 's' : '', o.employee && !o.isYou ? ` · ${o.employee}` : '')), /*#__PURE__*/React.createElement("div", {
    className: "or-total"
  }, fmtMoney(o.total)), /*#__PURE__*/React.createElement(Ic.ChevRight, {
    size: 16
  }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "pos-section-label"
  }, "Table actions"), /*#__PURE__*/React.createElement("div", {
    className: "pos-insp-grid"
  }, /*#__PURE__*/React.createElement("button", {
    className: "pos-btn-secondary"
  }, /*#__PURE__*/React.createElement(Ic.Transfer, {
    size: 14
  }), "Transfer table"), /*#__PURE__*/React.createElement("button", {
    className: "pos-btn-secondary"
  }, /*#__PURE__*/React.createElement(Ic.Merge, {
    size: 14
  }), "Merge checks"), /*#__PURE__*/React.createElement("button", {
    className: "pos-btn-secondary"
  }, /*#__PURE__*/React.createElement(Ic.Print, {
    size: 14
  }), "Print bill"), /*#__PURE__*/React.createElement("button", {
    className: "pos-btn-secondary"
  }, /*#__PURE__*/React.createElement(Ic.MoreH, {
    size: 14
  }), "More")))), /*#__PURE__*/React.createElement("div", {
    className: "pos-insp-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "pos-btn-primary"
  }, hasOrder ? /*#__PURE__*/React.createElement(React.Fragment, null, "Open check ", /*#__PURE__*/React.createElement(Ic.ArrowR, {
    size: 18
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Ic.Plus, {
    size: 18
  }), "Start order \xB7 ", guests || 1, " guest", (guests || 1) > 1 ? 's' : '')), hasOrder && /*#__PURE__*/React.createElement("button", {
    className: "pos-btn-secondary",
    style: {
      minHeight: 44
    }
  }, /*#__PURE__*/React.createElement(Ic.Plus, {
    size: 14
  }), " Start a new check on this table"))));
}

// ─── Employee / Time-entry sheet (popover) ───────────────────────────────
function EmployeeSheet({
  open,
  onClose,
  form
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "pos-sheet-scrim",
    "data-open": open,
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "pos-sheet",
    "data-open": open
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 18px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: 'var(--nova-plum-500)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontWeight: 700
    }
  }, "AR"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "Ana Rivera"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--fg-secondary)'
    }
  }, "Server \xB7 Clocked in 10:48 AM")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 10px',
      borderRadius: 999,
      background: 'var(--pos-available-bg)',
      color: 'var(--pos-available)',
      fontSize: 11,
      fontWeight: 700
    }
  }, "On shift")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 14,
      fontSize: 12,
      color: 'var(--fg-secondary)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-primary)',
      fontWeight: 700,
      fontSize: 15
    }
  }, "4h 12m"), "Elapsed"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-primary)',
      fontWeight: 700,
      fontSize: 15
    }
  }, "$284"), "Your sales"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-primary)',
      fontWeight: 700,
      fontSize: 15
    }
  }, "6"), "Tables served"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, [{
    ic: Ic.Coffee,
    label: 'Take rest break',
    hint: '10 min',
    danger: false
  }, {
    ic: Ic.Coffee,
    label: 'Take meal break',
    hint: '30 min',
    danger: false
  }, {
    ic: Ic.FileText,
    label: 'Shift review',
    hint: 'Tips & sales',
    danger: false
  }, {
    ic: Ic.Settings,
    label: 'Device settings',
    hint: 'Printers, cash drawer, pairing',
    danger: false
  }, {
    ic: Ic.LogOut,
    label: 'Clock out',
    hint: 'End shift',
    danger: true
  }].map((row, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 10,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      textAlign: 'left'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--canvas-dimmer)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: row.danger ? 'rgba(183,28,28,.1)' : 'var(--canvas-dimmer)',
      color: row.danger ? 'var(--pos-attention)' : 'var(--fg-primary)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(row.ic, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: row.danger ? 'var(--pos-attention)' : 'var(--fg-primary)'
    }
  }, row.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--fg-secondary)'
    }
  }, row.hint)), /*#__PURE__*/React.createElement(Ic.ChevRight, {
    size: 14,
    style: {
      color: 'var(--fg-tertiary)'
    }
  }))))));
}

// ─── Bottom nav (handheld) ───────────────────────────────────────────────
function BottomNav({
  activeTab,
  onTab,
  activeOrders,
  onlineOrders
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "pos-bottom-nav"
  }, NAV_TABS.map(tab => {
    const count = tab.badgeKey === 'activeOrderCount' ? activeOrders : tab.badgeKey === 'onlineOrderCount' ? onlineOrders : 0;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      className: "pos-bottom-item",
      "aria-selected": activeTab === tab.id,
      onClick: () => onTab(tab.id)
    }, /*#__PURE__*/React.createElement(tab.icon, {
      size: 22
    }), /*#__PURE__*/React.createElement("span", null, tab.label), count > 0 && /*#__PURE__*/React.createElement("span", {
      className: "b-badge"
    }, count));
  }));
}

// ─── Root ────────────────────────────────────────────────────────────────
function PosHome({
  form,
  theme,
  density
}) {
  const data = window.POS_DATA;
  const [selectedFloor, setSelectedFloor] = useState('main');
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState('dinein');
  const [empOpen, setEmpOpen] = useState(false);
  const stats = useMemo(() => data.floorCounts(), []);
  const tables = useMemo(() => data.tables.filter(t => t.floor === selectedFloor), [selectedFloor]);
  const selectedTableObj = selectedTable ? tables.find(t => t.id === selectedTable) : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "pos-root",
    "data-form": form,
    "data-theme": theme,
    "data-density": density
  }, /*#__PURE__*/React.createElement(PosHeader, {
    form: form,
    activeTab: activeTab,
    onTab: setActiveTab,
    onOpenEmployeeSheet: () => setEmpOpen(true),
    onOpenApprovals: () => {},
    pendingApprovals: data.pendingApprovalCount,
    activeOrders: data.activeOrderCount,
    onlineOrders: data.onlineOrderCount
  }), activeTab === 'dinein' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FloorRow, {
    floors: data.floors,
    selectedFloor: selectedFloor,
    onSelect: f => {
      setSelectedFloor(f);
      setSelectedTable(null);
    },
    stats: stats,
    form: form
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative',
      display: 'flex',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(FloorCanvas, {
    tables: tables,
    selectedId: selectedTable,
    onSelect: setSelectedTable,
    form: form
  }), /*#__PURE__*/React.createElement(TableInspector, {
    table: selectedTableObj,
    open: !!selectedTable,
    onClose: () => setSelectedTable(null),
    form: form
  }))), activeTab !== 'dinein' && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--fg-secondary)',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--fg-primary)'
    }
  }, NAV_TABS.find(t => t.id === activeTab)?.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, "Coming in the next redesign pass")), (form === 'handheld' || form === 'portrait') && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "pos-fab",
    title: "Quick order",
    onClick: () => setActiveTab('takeout')
  }, /*#__PURE__*/React.createElement(Ic.Plus, {
    size: 22
  }), /*#__PURE__*/React.createElement("span", null, "Quick Order")), /*#__PURE__*/React.createElement(BottomNav, {
    activeTab: activeTab,
    onTab: setActiveTab,
    activeOrders: data.activeOrderCount,
    onlineOrders: data.onlineOrderCount
  })), /*#__PURE__*/React.createElement(EmployeeSheet, {
    open: empOpen,
    onClose: () => setEmpOpen(false),
    form: form
  }));
}
window.PosHome = PosHome;
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/components/pos-home.jsx", error: String((e && e.message) || e) }); }

// pos_redesign/data/home-data.js
try { (() => {
// pos_redesign/data/home-data.js
// Mock data for POS Home screen.
// Seeded so every reload produces the same scene — demo-friendly.

window.POS_DATA = function () {
  // Five table states from the redesigned status semantics.
  const STATUSES = ['available', 'seated', 'ordered', 'ready', 'attention'];

  // Floors
  const floors = [{
    id: 'main',
    name: 'Main Hall',
    order: 0
  }, {
    id: 'patio',
    name: 'Patio',
    order: 1
  }, {
    id: 'bar',
    name: 'Bar',
    order: 2
  }, {
    id: 'private',
    name: 'Private',
    order: 3
  }];

  // Table generator — grid positions resolved at render time
  const tables = [
  // Main Hall
  {
    id: 't1',
    floor: 'main',
    name: 'T1',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 40,
    y: 40,
    cap: 4,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 't2',
    floor: 'main',
    name: 'T2',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 170,
    y: 40,
    cap: 4,
    guests: 3,
    status: 'seated',
    orders: [{
      id: 'o2',
      seats: 3,
      items: 0,
      total: 0,
      status: 'seated'
    }],
    waiter: 'Priya',
    elapsed: '6m'
  }, {
    id: 't3',
    floor: 'main',
    name: 'T3',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 300,
    y: 40,
    cap: 4,
    guests: 2,
    status: 'ordered',
    orders: [{
      id: 'o3',
      seats: 2,
      items: 5,
      total: 48.25,
      status: 'ordered'
    }],
    waiter: 'Marcus',
    elapsed: '22m'
  }, {
    id: 't4',
    floor: 'main',
    name: 'T4',
    shape: 'circle',
    w: 90,
    h: 90,
    x: 460,
    y: 40,
    cap: 2,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 't5',
    floor: 'main',
    name: 'T5',
    shape: 'rect',
    w: 150,
    h: 90,
    x: 580,
    y: 40,
    cap: 6,
    guests: 5,
    status: 'ready',
    orders: [{
      id: 'o5',
      seats: 5,
      items: 14,
      total: 186.40,
      status: 'ready'
    }],
    waiter: 'Priya',
    elapsed: '1h 04m'
  }, {
    id: 't6',
    floor: 'main',
    name: 'T6',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 40,
    y: 170,
    cap: 4,
    guests: 4,
    status: 'attention',
    orders: [{
      id: 'o6',
      seats: 4,
      items: 11,
      total: 124.80,
      status: 'attention'
    }],
    waiter: 'Marcus',
    elapsed: '1h 52m'
  }, {
    id: 't7',
    floor: 'main',
    name: 'T7',
    shape: 'circle',
    w: 90,
    h: 90,
    x: 190,
    y: 170,
    cap: 2,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 't8',
    floor: 'main',
    name: 'T8',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 310,
    y: 170,
    cap: 4,
    guests: 2,
    status: 'ordered',
    orders: [{
      id: 'o8a',
      seats: 2,
      items: 3,
      total: 28.50,
      status: 'ordered',
      employee: 'You',
      isYou: true
    }, {
      id: 'o8b',
      seats: 2,
      items: 2,
      total: 14.00,
      status: 'draft',
      employee: 'Priya',
      isYou: false
    }],
    waiter: 'You',
    elapsed: '18m'
  }, {
    id: 't9',
    floor: 'main',
    name: 'T9',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 440,
    y: 170,
    cap: 4,
    guests: 4,
    status: 'seated',
    orders: [{
      id: 'o9',
      seats: 4,
      items: 0,
      total: 0,
      status: 'seated'
    }],
    waiter: 'Sam',
    elapsed: '3m'
  }, {
    id: 't10',
    floor: 'main',
    name: 'T10',
    shape: 'rect',
    w: 150,
    h: 90,
    x: 570,
    y: 170,
    cap: 6,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 't11',
    floor: 'main',
    name: 'T11',
    shape: 'rect',
    w: 180,
    h: 90,
    x: 40,
    y: 300,
    cap: 8,
    guests: 7,
    status: 'ordered',
    orders: [{
      id: 'o11',
      seats: 7,
      items: 22,
      total: 312.60,
      status: 'ordered'
    }],
    waiter: 'Priya',
    elapsed: '48m'
  }, {
    id: 't12',
    floor: 'main',
    name: 'T12',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 240,
    y: 300,
    cap: 4,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 't13',
    floor: 'main',
    name: 'T13',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 370,
    y: 300,
    cap: 4,
    guests: 2,
    status: 'ready',
    orders: [{
      id: 'o13',
      seats: 2,
      items: 6,
      total: 64.25,
      status: 'ready'
    }],
    waiter: 'Marcus',
    elapsed: '54m'
  }, {
    id: 't14',
    floor: 'main',
    name: 'T14',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 500,
    y: 300,
    cap: 4,
    guests: 3,
    status: 'ordered',
    orders: [{
      id: 'o14',
      seats: 3,
      items: 8,
      total: 89.00,
      status: 'ordered'
    }],
    waiter: 'Sam',
    elapsed: '33m'
  }, {
    id: 't15',
    floor: 'main',
    name: 'T15',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 630,
    y: 300,
    cap: 4,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  },
  // Patio
  {
    id: 'p1',
    floor: 'patio',
    name: 'P1',
    shape: 'circle',
    w: 90,
    h: 90,
    x: 40,
    y: 40,
    cap: 2,
    guests: 2,
    status: 'ordered',
    orders: [{
      id: 'op1',
      seats: 2,
      items: 4,
      total: 38.50,
      status: 'ordered'
    }],
    waiter: 'Sam',
    elapsed: '19m'
  }, {
    id: 'p2',
    floor: 'patio',
    name: 'P2',
    shape: 'circle',
    w: 90,
    h: 90,
    x: 170,
    y: 40,
    cap: 2,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 'p3',
    floor: 'patio',
    name: 'P3',
    shape: 'circle',
    w: 90,
    h: 90,
    x: 300,
    y: 40,
    cap: 2,
    guests: 2,
    status: 'ready',
    orders: [{
      id: 'op3',
      seats: 2,
      items: 5,
      total: 52.00,
      status: 'ready'
    }],
    waiter: 'Priya',
    elapsed: '42m'
  }, {
    id: 'p4',
    floor: 'patio',
    name: 'P4',
    shape: 'rect',
    w: 150,
    h: 90,
    x: 40,
    y: 160,
    cap: 6,
    guests: 5,
    status: 'seated',
    orders: [{
      id: 'op4',
      seats: 5,
      items: 0,
      total: 0,
      status: 'seated'
    }],
    waiter: 'Marcus',
    elapsed: '2m'
  }, {
    id: 'p5',
    floor: 'patio',
    name: 'P5',
    shape: 'rect',
    w: 150,
    h: 90,
    x: 210,
    y: 160,
    cap: 6,
    guests: 0,
    status: 'available',
    orders: [],
    waiter: null,
    elapsed: null
  }, {
    id: 'p6',
    floor: 'patio',
    name: 'P6',
    shape: 'rect',
    w: 110,
    h: 90,
    x: 380,
    y: 160,
    cap: 4,
    guests: 4,
    status: 'attention',
    orders: [{
      id: 'op6',
      seats: 4,
      items: 12,
      total: 138.25,
      status: 'attention'
    }],
    waiter: 'Sam',
    elapsed: '2h 10m'
  }];

  // Counts by status per floor — for the chips
  function floorCounts() {
    const out = {};
    for (const f of floors) out[f.id] = {
      total: 0,
      active: 0,
      ready: 0,
      attention: 0
    };
    for (const t of tables) {
      if (!out[t.floor]) continue;
      out[t.floor].total++;
      if (t.status !== 'available') out[t.floor].active++;
      if (t.status === 'ready') out[t.floor].ready++;
      if (t.status === 'attention') out[t.floor].attention++;
    }
    return out;
  }

  // Aggregated stats for the floor-row summary
  function globalStats() {
    let avail = 0,
      seated = 0,
      ordered = 0,
      ready = 0,
      attention = 0;
    for (const t of tables) {
      if (t.status === 'available') avail++;else if (t.status === 'seated') seated++;else if (t.status === 'ordered') ordered++;else if (t.status === 'ready') ready++;else if (t.status === 'attention') attention++;
    }
    return {
      avail,
      seated,
      ordered,
      ready,
      attention
    };
  }

  // Nav-tab order count + approvals
  const activeOrderCount = tables.reduce((n, t) => n + (t.orders?.length || 0), 0);
  const onlineOrderCount = 4; // mocked: delivery + takeaway queue
  const pendingApprovalCount = 3; // 2 voids + 1 comp

  return {
    floors,
    tables,
    activeOrderCount,
    onlineOrderCount,
    pendingApprovalCount,
    floorCounts,
    globalStats
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/data/home-data.js", error: String((e && e.message) || e) }); }

// pos_redesign/design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), labels/titles are inline-editable,
// and any artboard can be opened in a fullscreen focus overlay (←/→/Esc).
// State persists to a .design-canvas.state.json sidecar via the host
// bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}', '.dc-card{transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px}', '.dc-grip{cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{cursor:pointer;border-radius:4px;padding:3px 6px;display:flex;align-items:center;transition:background .12s}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-expand{position:absolute;bottom:100%;right:0;margin-bottom:5px;z-index:2;opacity:0;transition:opacity .12s,background .12s;', '  width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center}', '.dc-expand:hover{background:rgba(0,0,0,.06);color:#2a251f}', '[data-dc-slot]:hover .dc-expand{opacity:1}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, focused
// artboard). Order/titles/labels persist to a .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Only direct DCSection > DCArtboard children are
  // walked — wrapping them in other elements opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  React.Children.forEach(children, sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const srcIds = [];
    React.Children.forEach(sec.props.children, ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (!aid) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if (e.ctrlKey) {
        // trackpad pinch (or explicit ctrl+wheel)
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(children);
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const srcOrder = artboards.map(a => a.props.id ?? a.props.label);
  const sec = ctx && sid && ctx.section(sid) || {};
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 80,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px 56px'
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow",
    style: {
      position: 'absolute',
      bottom: '100%',
      left: -4,
      marginBottom: 4,
      color: DC.label
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    onPointerDown: e => e.stopPropagation(),
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    const ns = sectionOrder[(secIdx + d + sectionOrder.length) % sectionOrder.length];
    const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
    if (first) ctx.setFocus(`${ns}/${first}`);
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/design-canvas.jsx", error: String((e && e.message) || e) }); }

// pos_redesign/workflows/components/landing-screens.jsx
try { (() => {
/* global React, Icons */
// pos_redesign/workflows/components/landing-screens.jsx
// Landing workflow — navigation chrome (appbar + drawer + tabs) and
// the landing state of each top-level tab (Dine-in / Walk-in / Orders / Online).
// Props: { form: 'tablet'|'handheld', tab: 'dinein'|'walkin'|'orders'|'online',
//          drawerOpen?: bool, banner?: 'none'|'offline'|'unstable'|'firmware'|'sync',
//          variant?: '' | 'noperm' }

const Ic = window.Icons;

// ─── Mock data ───────────────────────────────────────────────────────────
const TABS = [{
  id: 'dinein',
  label: 'Dine-in',
  icon: Ic.DineIn,
  badge: 0
}, {
  id: 'walkin',
  label: 'Walk-in',
  icon: Ic.Takeout,
  badge: 0
}, {
  id: 'orders',
  label: 'Orders',
  icon: Ic.Orders,
  badge: 12
}, {
  id: 'online',
  label: 'Online',
  icon: Ic.Online,
  badge: 4
}];
const AREAS = [{
  id: 'main',
  name: 'Main Dining'
}, {
  id: 'patio',
  name: 'Patio'
}, {
  id: 'bar',
  name: 'Bar'
}, {
  id: 'priv',
  name: 'Private'
}];

// 12 tables for the dine-in landing
const TABLES = [{
  name: 'T01',
  seats: 2,
  status: 'available'
}, {
  name: 'T02',
  seats: 4,
  status: 'seated',
  waiter: 'Diego M.'
}, {
  name: 'T03',
  seats: 4,
  status: 'ordered',
  waiter: 'Sasha P.',
  timer: '24m'
}, {
  name: 'T04',
  seats: 6,
  status: 'available'
}, {
  name: 'T05',
  seats: 2,
  status: 'ready',
  waiter: 'Ana R.',
  timer: '06m'
}, {
  name: 'T06',
  seats: 4,
  status: 'attention',
  waiter: 'Diego M.',
  timer: '92m',
  merge: 'T07'
}, {
  name: 'T07',
  seats: 4,
  status: 'attention',
  waiter: 'Diego M.',
  merge: 'T06'
}, {
  name: 'T08',
  seats: 8,
  status: 'available'
}, {
  name: 'T09',
  seats: 2,
  status: 'seated',
  waiter: 'Mei L.'
}, {
  name: 'T10',
  seats: 4,
  status: 'ordered',
  waiter: 'Ana R.',
  timer: '18m'
}, {
  name: 'T11',
  seats: 6,
  status: 'available'
}, {
  name: 'T12',
  seats: 2,
  status: 'available'
}];
const STATUS_LABEL = {
  available: 'Open',
  seated: 'Seated',
  ordered: 'Sent',
  ready: 'Ready to pay',
  attention: 'Needs attention'
};
const MENU_CATEGORIES = ['Featured', 'Starters', 'Mains', 'Salads', 'Pizza', 'Sides', 'Desserts', 'Drinks'];
const MENU_ITEMS = [{
  name: 'Caesar Salad',
  desc: 'Romaine, parmesan, garlic croutons',
  price: 11.50
}, {
  name: 'Margherita Pizza',
  desc: 'San marzano, mozzarella, basil',
  price: 16.00
}, {
  name: 'Pepperoni Pizza',
  desc: 'Hand-stretched, aged provolone',
  price: 18.00
}, {
  name: 'Truffle Fries',
  desc: 'Parmesan, parsley, garlic aioli',
  price: 9.00
}, {
  name: 'Grilled Salmon',
  desc: 'Lemon butter, seasonal greens',
  price: 24.00
}, {
  name: 'Penne Arrabbiata',
  desc: 'Spicy tomato, garlic, fresh herbs',
  price: 16.50
}, {
  name: 'Burrata Toast',
  desc: 'Heirloom tomato, basil oil, sourdough',
  price: 13.00
}, {
  name: 'Tiramisu',
  desc: 'Mascarpone, espresso, cocoa',
  price: 9.50
}];
const ORDERS = [{
  num: '#10247',
  table: 'T-04',
  server: 'Ana R.',
  total: 42.30,
  time: '2 min ago',
  pills: [['ordered', 'Sent']],
  items: 6
}, {
  num: '#10246',
  table: 'T-09',
  server: 'Mei L.',
  total: 88.50,
  time: '6 min ago',
  pills: [['ready', 'Ready']],
  items: 9
}, {
  num: '#10245',
  table: 'Walk',
  server: 'Diego M.',
  total: 24.00,
  time: '11 min ago',
  pills: [['draft', 'Draft']],
  items: 3
}, {
  num: '#10244',
  table: 'T-03',
  server: 'Sasha P.',
  total: 56.75,
  time: '14 min ago',
  pills: [['ordered', 'Sent']],
  items: 7
}, {
  num: '#10243',
  table: 'T-06',
  server: 'Diego M.',
  total: 132.10,
  time: '92 min ago',
  pills: [['att', 'Unpaid · 92m']],
  items: 14
}, {
  num: '#10242',
  table: 'T-01',
  server: 'Ana R.',
  total: 18.00,
  time: '1 hr ago',
  pills: [['paid', 'Paid']],
  items: 2
}, {
  num: '#10241',
  table: 'Walk',
  server: 'Mei L.',
  total: 36.50,
  time: '1 hr ago',
  pills: [['paid', 'Paid']],
  items: 4
}, {
  num: '#10240',
  table: 'T-08',
  server: 'Sasha P.',
  total: 224.00,
  time: '2 hr ago',
  pills: [['paid', 'Paid']],
  items: 21
}];
const ONLINE_ORDERS = [{
  num: '#OL-882',
  cust: 'M. Thompson',
  channel: 'DoorDash',
  total: 38.40,
  time: 'In 12 min',
  pills: [['delivery', 'Delivery'], ['ordered', 'Confirmed']],
  items: 4
}, {
  num: '#OL-881',
  cust: 'A. Rodriguez',
  channel: 'UberEats',
  total: 22.00,
  time: 'In 18 min',
  pills: [['delivery', 'Delivery'], ['ordered', 'Cooking']],
  items: 2
}, {
  num: '#OL-880',
  cust: 'J. Park',
  channel: 'Web · Pickup',
  total: 54.50,
  time: 'Now',
  pills: [['pickup', 'Pickup'], ['ready', 'Ready']],
  items: 5
}, {
  num: '#OL-879',
  cust: 'L. Chen',
  channel: 'Web · Pickup',
  total: 12.00,
  time: '5 min',
  pills: [['pickup', 'Pickup'], ['ordered', 'Cooking']],
  items: 1
}, {
  num: '#OL-878',
  cust: 'P. Williams',
  channel: 'DoorDash',
  total: 88.20,
  time: 'Just now',
  pills: [['delivery', 'Delivery'], ['ordered', 'Picked up']],
  items: 8
}];

// ─── App bar ─────────────────────────────────────────────────────────────
function Appbar({
  form,
  tab,
  banner,
  onTab,
  onMenu
}) {
  const isHH = form === 'handheld';
  const showCenterTabs = !isHH;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("header", {
    className: "lnd-appbar"
  }, /*#__PURE__*/React.createElement("button", {
    className: "lnd-menu-btn",
    onClick: onMenu,
    "aria-label": "Open menu"
  }, /*#__PURE__*/React.createElement(Ic.Menu, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "lnd-rest-avatar"
  }, "NT"), !isHH && /*#__PURE__*/React.createElement("div", {
    className: "lnd-rest-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "Nova Test Restaurant"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Portland Westside \xB7 Terminal 02")), isHH && /*#__PURE__*/React.createElement("div", {
    className: "lnd-rest-meta",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "Nova Test"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Term \xB7 02")), showCenterTabs && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'center',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-tabs",
    role: "tablist"
  }, TABS.map(t => {
    const Icon = t.icon;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      className: "lnd-tab",
      role: "tab",
      "aria-selected": tab === t.id,
      onClick: () => onTab && onTab(t.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      size: 16
    }), /*#__PURE__*/React.createElement("span", null, t.label), t.badge > 0 && /*#__PURE__*/React.createElement("span", {
      className: "badge"
    }, t.badge));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-right"
  }, !isHH && /*#__PURE__*/React.createElement("button", {
    className: "lnd-quick-sale"
  }, /*#__PURE__*/React.createElement(Ic.Plus, {
    size: 16
  }), " Quick Order"), /*#__PURE__*/React.createElement("button", {
    className: "lnd-icon-btn",
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(Ic.Bell, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    className: "notif"
  }, "3")), !isHH && /*#__PURE__*/React.createElement("button", {
    className: "lnd-emp-chip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, "AR"), /*#__PURE__*/React.createElement("span", {
    className: "meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "nm"
  }, "Ana Rivera"), /*#__PURE__*/React.createElement("span", {
    className: "sh"
  }, "Shift \xB7 4h 12m")), /*#__PURE__*/React.createElement(Ic.ChevDown, {
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "lnd-lock-btn",
    "aria-label": "Lock terminal"
  }, /*#__PURE__*/React.createElement(Ic.Lock, {
    size: isHH ? 18 : 20
  })))), banner === 'sync' && /*#__PURE__*/React.createElement("div", {
    className: "lnd-sync-stripe"
  }), banner === 'offline' && /*#__PURE__*/React.createElement("div", {
    className: "lnd-banner-offline"
  }, /*#__PURE__*/React.createElement(Ic.AlertTri, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "You are offline. Do not uninstall the app.")), banner === 'unstable' && /*#__PURE__*/React.createElement("div", {
    className: "lnd-banner-offline unstable"
  }, /*#__PURE__*/React.createElement(Ic.AlertTri, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, "Internet is unstable")), banner === 'firmware' && /*#__PURE__*/React.createElement("div", {
    className: "lnd-banner-firmware"
  }, /*#__PURE__*/React.createElement(Ic.Zap, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Card reader firmware update available."), " Recommended to install before next shift."), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Update now \u203A")));
}

// ─── Drawer ──────────────────────────────────────────────────────────────
function Drawer({
  tab,
  open,
  onClose,
  onTab
}) {
  const items = [{
    id: 'dinein',
    label: 'Dine-in',
    icon: Ic.DineIn,
    badge: 0
  }, {
    id: 'walkin',
    label: 'Walk-in',
    icon: Ic.Takeout,
    badge: 0
  }, {
    id: 'orders',
    label: 'Orders',
    icon: Ic.Orders,
    badge: 12
  }, {
    id: 'online',
    label: 'Online',
    icon: Ic.Online,
    badge: 4
  }];
  const more = [{
    id: 'reserv',
    label: 'Reservations',
    icon: Ic.FileText
  }, {
    id: 'reports',
    label: 'Reports',
    icon: Ic.Grid
  }, {
    id: 'safedrop',
    label: 'Safe drops',
    icon: Ic.Shield
  }, {
    id: 'settings',
    label: 'Settings',
    icon: Ic.Settings
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "lnd-drawer-scrim",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("aside", {
    className: "lnd-drawer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-drawer-brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, "NT"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "Nova Test Restaurant"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Portland Westside"), /*#__PURE__*/React.createElement("div", {
    className: "term"
  }, "Terminal 02 \xB7 v4.18.2"))), /*#__PURE__*/React.createElement("nav", {
    className: "lnd-drawer-list"
  }, items.map(it => {
    const Icon = it.icon;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      className: "lnd-drawer-item",
      "aria-current": tab === it.id,
      onClick: () => onTab && onTab(it.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      className: "label"
    }, it.label), it.badge > 0 && /*#__PURE__*/React.createElement("span", {
      className: "badge"
    }, it.badge));
  }), /*#__PURE__*/React.createElement("div", {
    className: "lnd-drawer-divider"
  }), more.map(it => {
    const Icon = it.icon;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      className: "lnd-drawer-item"
    }, /*#__PURE__*/React.createElement(Icon, {
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      className: "label"
    }, it.label), /*#__PURE__*/React.createElement(Ic.ChevRight, {
      size: 14
    }));
  })), /*#__PURE__*/React.createElement("div", {
    className: "lnd-drawer-footer"
  }, /*#__PURE__*/React.createElement("span", null, "Ana Rivera \xB7 Server"), /*#__PURE__*/React.createElement(Ic.LogOut, {
    size: 14
  }))));
}

// ─── Tab content: Dine-in ────────────────────────────────────────────────
function DineInTab({
  form
}) {
  const isHH = form === 'handheld';
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "lnd-areabar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-area-tabs",
    role: "tablist"
  }, AREAS.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: a.id,
    className: "lnd-area-tab",
    role: "tab",
    "aria-selected": i === 0
  }, a.name))), !isHH && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "lnd-view-toggle"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-selected": true,
    title: "Classic grid"
  }, /*#__PURE__*/React.createElement(Ic.Grid, {
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    title: "Floor map"
  }, /*#__PURE__*/React.createElement(Ic.MapPin, {
    size: 16
  }))), /*#__PURE__*/React.createElement("button", {
    className: "lnd-quick-order-btn"
  }, "Quick Order"))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-table-grid"
  }, TABLES.map((t, i) => /*#__PURE__*/React.createElement(TableTile, {
    key: i,
    table: t,
    compact: isHH
  }))));
}
function TableTile({
  table,
  compact
}) {
  const occupied = table.status !== 'available';
  return /*#__PURE__*/React.createElement("div", {
    className: "lnd-table",
    "data-status": table.status
  }, /*#__PURE__*/React.createElement("div", {
    className: "top-row"
  }, occupied ? /*#__PURE__*/React.createElement("span", {
    className: "occ-icon"
  }, /*#__PURE__*/React.createElement(Ic.User, {
    size: 14
  })) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26
    }
  }), table.merge && /*#__PURE__*/React.createElement("span", {
    className: "merge-tag"
  }, "Merge \xB7 ", table.merge)), /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, table.name), /*#__PURE__*/React.createElement("div", {
    className: "seats"
  }, table.waiter ? `${table.waiter} · ${table.seats} seats` : `Seats ${table.seats}`), /*#__PURE__*/React.createElement("div", {
    className: "footer-strip"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), /*#__PURE__*/React.createElement("span", null, STATUS_LABEL[table.status]), table.timer && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      opacity: .8
    }
  }, table.timer)));
}

// ─── Tab content: Walk-in (drops to order creation, empty cart) ──────────
function WalkInTab({
  form
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "lnd-walkin-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-walkin-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-search"
  }, /*#__PURE__*/React.createElement(Ic.Search, {
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, "Search menu items, modifiers, custom amounts\u2026")), /*#__PURE__*/React.createElement("div", {
    className: "lnd-cat-row"
  }, MENU_CATEGORIES.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: c,
    className: "lnd-cat-pill",
    "aria-selected": i === 0
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-menu-grid"
  }, MENU_ITEMS.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "lnd-menu-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nm"
  }, it.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, it.desc), /*#__PURE__*/React.createElement("div", {
    className: "price"
  }, "$", it.price.toFixed(2)))))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-walkin-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-cart-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, "Walk-in #\u2014"), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, "No items \xB7 No customer")), /*#__PURE__*/React.createElement("button", {
    className: "lnd-icon-btn",
    "aria-label": "More"
  }, /*#__PURE__*/React.createElement(Ic.MoreH, {
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-cart-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ico"
  }, /*#__PURE__*/React.createElement(Ic.Takeout, {
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, "Start a walk-in order"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Tap items on the left to add. The cart fills here as you go.")), /*#__PURE__*/React.createElement("div", {
    className: "lnd-cart-footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Subtotal"), /*#__PURE__*/React.createElement("span", null, "$0.00")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Tax"), /*#__PURE__*/React.createElement("span", null, "$0.00")), /*#__PURE__*/React.createElement("div", {
    className: "row total"
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "$0.00")), /*#__PURE__*/React.createElement("button", {
    className: "lnd-cart-cta"
  }, "Send to kitchen"))));
}

// ─── Tab content: Orders (split list/detail) ─────────────────────────────
function OrdersTab({
  form,
  online
}) {
  const data = online ? ONLINE_ORDERS : ORDERS;
  const filters = online ? ['All', 'Active', 'Ready', 'Picked up', 'Refunded'] : ['All', 'Open', 'Drafts', 'Paid', 'Refunded'];
  return /*#__PURE__*/React.createElement("div", {
    className: "lnd-orders-split"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-orders-list"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-orders-toolbar"
  }, filters.map((f, i) => /*#__PURE__*/React.createElement("button", {
    key: f,
    className: "filter-pill",
    "aria-selected": i === 0
  }, f)), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-selected": true
  }, "Today"), /*#__PURE__*/React.createElement("button", null, "Week"), /*#__PURE__*/React.createElement("button", null, "All"))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-orders-scroll"
  }, data.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: o.num,
    className: "lnd-order-card",
    "aria-selected": i === 0
  }, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, o.num), /*#__PURE__*/React.createElement("span", {
    className: "total"
  }, "$", o.total.toFixed(2))), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, online ? `${o.cust} · ${o.channel}` : `${o.table} · ${o.server}`), /*#__PURE__*/React.createElement("span", null, o.time)), /*#__PURE__*/React.createElement("div", {
    className: "pills"
  }, o.pills.map(([k, lbl]) => /*#__PURE__*/React.createElement("span", {
    key: k,
    className: `pill pill-${k}`
  }, lbl)), /*#__PURE__*/React.createElement("span", {
    className: "pill pill-draft"
  }, o.items, " items")))))), /*#__PURE__*/React.createElement("div", {
    className: "lnd-orders-detail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lnd-orders-detail-empty"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ico"
  }, /*#__PURE__*/React.createElement(Ic.FileText, {
    size: 28
  })), /*#__PURE__*/React.createElement("div", {
    className: "ttl"
  }, "Select an order"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Choose any order on the left to see items, payments, and timing. Long-press for quick actions."))));
}

// ─── Bottom nav (handheld only) ──────────────────────────────────────────
function BottomNav({
  tab,
  onTab
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "lnd-bottom-nav"
  }, TABS.map(t => {
    const Icon = t.icon;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      className: "lnd-bn-item",
      "aria-selected": tab === t.id,
      onClick: () => onTab && onTab(t.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      size: 20
    }), /*#__PURE__*/React.createElement("span", null, t.label), t.badge > 0 && /*#__PURE__*/React.createElement("span", {
      className: "badge"
    }, t.badge > 9 ? '9+' : t.badge));
  }));
}

// ─── No-permission state (full-screen, no body navigation) ───────────────
function NoPermission({
  form
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 32,
      gap: 16,
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: 18,
      background: 'rgba(183,28,28,.08)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--pos-attention)'
    }
  }, /*#__PURE__*/React.createElement(Ic.Shield, {
    size: 32
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      color: 'var(--fg-primary)'
    }
  }, "POS access not granted"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--fg-secondary)',
      maxWidth: 360,
      lineHeight: 1.5
    }
  }, "Your role doesn't include POS landing permissions. Clock in to start your shift, or ask a manager to update your role."), /*#__PURE__*/React.createElement("button", {
    style: {
      marginTop: 8,
      padding: '12px 22px',
      borderRadius: 12,
      background: 'var(--nova-rage-600)',
      color: '#fff',
      border: 'none',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Clock in"));
}

// ─── Shell (composes everything) ─────────────────────────────────────────
function LandingShell({
  form = 'tablet',
  tab = 'dinein',
  drawerOpen = false,
  banner = 'none',
  variant = ''
}) {
  const [t, setT] = React.useState(tab);
  const [open, setOpen] = React.useState(drawerOpen);
  React.useEffect(() => {
    setT(tab);
  }, [tab]);
  React.useEffect(() => {
    setOpen(drawerOpen);
  }, [drawerOpen]);
  const isHH = form === 'handheld';
  return /*#__PURE__*/React.createElement("div", {
    className: "lnd-root",
    "data-form": form,
    "data-drawer": open ? 'open' : 'closed'
  }, /*#__PURE__*/React.createElement(Appbar, {
    form: form,
    tab: t,
    banner: banner,
    onMenu: () => setOpen(true),
    onTab: setT
  }), /*#__PURE__*/React.createElement("div", {
    className: "lnd-body"
  }, variant === 'noperm' ? /*#__PURE__*/React.createElement(NoPermission, {
    form: form
  }) : t === 'dinein' ? /*#__PURE__*/React.createElement(DineInTab, {
    form: form
  }) : t === 'walkin' ? /*#__PURE__*/React.createElement(WalkInTab, {
    form: form
  }) : t === 'orders' ? /*#__PURE__*/React.createElement(OrdersTab, {
    form: form,
    online: false
  }) : /*#__PURE__*/React.createElement(OrdersTab, {
    form: form,
    online: true
  })), isHH && variant !== 'noperm' && /*#__PURE__*/React.createElement(BottomNav, {
    tab: t,
    onTab: setT
  }), /*#__PURE__*/React.createElement(Drawer, {
    tab: t,
    open: open,
    onClose: () => setOpen(false),
    onTab: id => {
      setT(id);
      setOpen(false);
    }
  }));
}
Object.assign(window, {
  LandingShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "pos_redesign/workflows/components/landing-screens.jsx", error: String((e && e.message) || e) }); }

})();
