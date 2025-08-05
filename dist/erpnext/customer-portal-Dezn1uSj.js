import{f as t,u as o,d as l,j as a}from"./customer-portal.js";import{t as c,C as n,a as d,B as x}from"./customer-portal-Dytd1BVN.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=t("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=t("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);function h(){const[,s]=o(),{language:r}=l(),e=c[r].dashboard;return a.jsx("div",{className:"min-h-screen w-full flex items-center justify-center",style:{backgroundColor:"var(--portal-background)"},children:a.jsx(n,{className:"w-full max-w-md mx-4 portal-card border-portal",children:a.jsxs(d,{className:"pt-8 pb-8 text-center",children:[a.jsx(i,{className:"h-16 w-16 text-red-500 mx-auto mb-4"}),a.jsx("h1",{className:"text-3xl font-bold mb-2",style:{color:"var(--portal-text)"},children:"404"}),a.jsx("h2",{className:"text-xl font-semibold mb-4",style:{color:"var(--portal-text)"},children:e.pageNotFound}),a.jsx("p",{className:"mb-6",style:{color:"var(--portal-accent)"},children:e.pageDoesntExist}),a.jsxs(x,{onClick:()=>s("/dashboard"),className:"items-center gap-2",style:{backgroundColor:"var(--portal-primary)"},children:[a.jsx(m,{className:"h-4 w-4"}),e.goToDashboard]})]})})})}export{h as default};
