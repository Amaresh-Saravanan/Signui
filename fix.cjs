const fs = require('fs');

// Navbar - remove cn import
let f = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
f = f.replace("import { cn } from '../utils/cn';\n", '');
fs.writeFileSync('src/components/Navbar.tsx', f);

// Sidebar - remove unused imports
f = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
f = f.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion } from 'framer-motion';");
f = f.replace('import { Home, Video, Clock, BookOpen, BarChart2, Settings, User, Info, Mail, Menu, X } from', 'import { Home, Video, Clock, BookOpen, BarChart2, Settings, User, Info, Mail } from');
f = f.replace("import { useState } from 'react';\n", '');
fs.writeFileSync('src/components/Sidebar.tsx', f);

// Auth - remove Card import
f = fs.readFileSync('src/pages/Auth.tsx', 'utf8');
f = f.replace("import { Card } from '../components/Card';\n", '');
fs.writeFileSync('src/pages/Auth.tsx', f);

// Dashboard - remove unused lucide imports
f = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
f = f.replace('import { ArrowRight, Flame, Clock, MessageSquare, BookOpen, Video } from', 'import { ArrowRight, Flame, Video } from');
fs.writeFileSync('src/pages/Dashboard.tsx', f);

// History - remove MoreHorizontal
f = fs.readFileSync('src/pages/History.tsx', 'utf8');
f = f.replace('import { Bookmark, MoreHorizontal, Trash2, Filter }', 'import { Bookmark, Trash2, Filter }');
fs.writeFileSync('src/pages/History.tsx', f);

// Landing - keep only StrokeDivider from SignStroke
f = fs.readFileSync('src/pages/Landing.tsx', 'utf8');
f = f.replace("import { SignStroke, StrokeDivider } from '../components/SignStroke';", "import { StrokeDivider } from '../components/SignStroke';");
// Remove the useTypewriter function that is declared but not used (the landing page doesn't call it)
const twStart = f.indexOf('/* -- Typewriter hook');
const twEnd = f.indexOf('\n\n/* --', twStart + 5);
if (twStart !== -1 && twEnd !== -1) {
  f = f.slice(0, twStart) + f.slice(twEnd + 2);
}
fs.writeFileSync('src/pages/Landing.tsx', f);

// Phrasebook - remove cn
f = fs.readFileSync('src/pages/Phrasebook.tsx', 'utf8');
f = f.replace("import { cn } from '../utils/cn';\n", '');
fs.writeFileSync('src/pages/Phrasebook.tsx', f);

console.log('All unused imports cleaned');
