
import { CrossfilterDashboard } from './components/CrossfilterDashboard'
import { MantineProvider } from "@mantine/core";

// const theme = createTheme({
//   primaryColor: "blue",
//   fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
//   fontFamilyMonospace: "var(--font-geist-mono), monospace",
//   headings: {
//     fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
//     fontWeight: "600",
//   },
//   defaultRadius: "md",
//   colors: {
//     ink: [
//       "#f7f8fa",
//       "#eceff3",
//       "#d7dde5",
//       "#b8c2cf",
//       "#8f9bad",
//       "#667386",
//       "#4a5566",
//       "#343d4b",
//       "#212936",
//       "#111827",
//     ],
//   },
// });
function App() {
  return (<MantineProvider 
  // theme={theme} 
  defaultColorScheme="light">
    <CrossfilterDashboard dataUrl="/api/dashboard-data.json" />
  </MantineProvider>);
}

export default App
