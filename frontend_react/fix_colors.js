import fs from 'fs';
const path = 'd:/AndroidStudio/TestProject/LabReportTracker/frontend_react/src/pages/Profile.jsx';
let content = fs.readFileSync(path, 'utf8');

const mapping = [
    [/var\(--border-color\)/g, "var(--border-color)"], 
    [/'#E1F0FF'/g, "'var(--blue-badge-bg)'"],
    [/'#007AFF'/g, "'var(--primary-color)'"],
    [/'#8E8E93'/g, "'var(--text-secondary)'"],
    [/'#E5E5EA'/g, "'var(--border-color)'"],
    [/'#F2F2F7'/g, "'var(--border-color)'"],
    [/'#FFF0F5'/g, "'var(--danger-bg)'"],
    [/'#FF2D55'/g, "'var(--btn-cancel-bg)'"],
    [/'#FF3B30'/g, "'var(--btn-cancel-bg)'"],
    [/'#F0FFF4'/g, "'var(--success-bg)'"],
    [/'#27ae60'/g, "'var(--success-text)'"],
    [/'#1C1C1E'/g, "'var(--text-primary)'"],
    [/tab === t \? 'white'/g, "tab === t ? 'var(--tab-active-bg)'"],
    [/tab === t \? 'black'/g, "tab === t ? 'var(--text-primary)'"],
    [/background: 'white'/g, "background: 'var(--card-bg)'"],
    [/background: 'var\(--card-bg\)', padding: '16px'/g, "background: '#ffffff', padding: '16px'"] 
];

mapping.forEach(([regex, replace]) => {
    content = content.replace(regex, replace);
});

content = content.replace("background: 'var(--border-color)', padding: '4px', borderRadius: '12px', marginBottom: '24px'", "background: 'var(--tab-bg)', padding: '4px', borderRadius: '12px', marginBottom: '24px'");

fs.writeFileSync(path, content, 'utf8');
console.log("Colors successfully mapped to CSS variables.");
