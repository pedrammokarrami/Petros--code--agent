using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace Petros.Desktop
{
    static class Program
    {
        private const string AppTitle = "Petros Autonomous Engineering & Operations AI";
        private const int DefaultPort = 3000;
        private static Process _backendProcess = null;
        private static bool _weStartedBackend = false;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string petrosDir = FindPetrosRoot(baseDir);

            if (string.IsNullOrEmpty(petrosDir))
            {
                MessageBox.Show(
                    "Unable to locate the Petros root directory.\nPlease verify your installation.",
                    AppTitle,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Set up user persistence directories
            string appDataPetros = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Petros"
            );
            string userDesktopWorkspace = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Desktop",
                "petros"
            );

            try
            {
                if (!Directory.Exists(appDataPetros))
                {
                    Directory.CreateDirectory(appDataPetros);
                }
                if (!Directory.Exists(userDesktopWorkspace))
                {
                    Directory.CreateDirectory(userDesktopWorkspace);
                }
            }
            catch { }

            int targetPort = DefaultPort;
            bool isBackendReady = CheckServerHealth(targetPort);

            if (!isBackendReady)
            {
                // Find node.exe
                string nodePath = FindNodeExecutable(petrosDir);
                if (string.IsNullOrEmpty(nodePath))
                {
                    DialogResult res = MessageBox.Show(
                        "Node.js runtime was not found.\nPetros requires Node.js (v18+ or v20+) to run its local autonomous services.\n\nWould you like to open the Node.js download page now?",
                        AppTitle + " - Node.js Required",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning
                    );
                    if (res == DialogResult.Yes)
                    {
                        Process.Start("https://nodejs.org/en/download/");
                    }
                    return;
                }

                // Verify dist/server.cjs
                string serverScript = Path.Combine(petrosDir, "dist", "server.cjs");
                if (!File.Exists(serverScript))
                {
                    MessageBox.Show(
                        "Production bundle not found: " + serverScript + "\nPlease rebuild or reinstall Petros.",
                        AppTitle,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                // Check Ollama and try to start if installed
                EnsureOllamaRunning();

                // Start node dist/server.cjs in hidden mode
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = nodePath;
                    psi.Arguments = "\"" + serverScript + "\"";
                    psi.WorkingDirectory = petrosDir;
                    psi.CreateNoWindow = true;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.UseShellExecute = false;

                    // Environment variables
                    psi.EnvironmentVariables["PORT"] = targetPort.ToString();
                    psi.EnvironmentVariables["BIND_HOST"] = "127.0.0.1";
                    psi.EnvironmentVariables["NODE_ENV"] = "production";
                    psi.EnvironmentVariables["PETROS_DATA_DIR"] = appDataPetros;
                    psi.EnvironmentVariables["PETROS_WORKSPACE_ROOT"] = userDesktopWorkspace;

                    _backendProcess = Process.Start(psi);
                    _weStartedBackend = true;
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        "Failed to launch Petros backend service:\n" + ex.Message,
                        AppTitle,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                // Wait for server to become healthy
                isBackendReady = WaitForServerHealth(targetPort, 20);
                if (!isBackendReady)
                {
                    MessageBox.Show(
                        "Petros backend service failed to respond within 20 seconds.\nPlease check for port conflicts on port 3000.",
                        AppTitle,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );
                }
            }

            // Launch Desktop App Window via Edge / Chrome in App Mode
            string appUrl = "http://127.0.0.1:" + targetPort;
            string browserPath = FindAppBrowser();

            if (!string.IsNullOrEmpty(browserPath))
            {
                string profileDir = Path.Combine(appDataPetros, "desktop-profile");
                string browserArgs = string.Format(
                    "--app=\"{0}\" --window-size=1366,860 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check",
                    appUrl,
                    profileDir
                );

                try
                {
                    ProcessStartInfo bpsi = new ProcessStartInfo();
                    bpsi.FileName = browserPath;
                    bpsi.Arguments = browserArgs;
                    bpsi.UseShellExecute = false;

                    Process browserProc = Process.Start(bpsi);
                    if (browserProc != null)
                    {
                        browserProc.WaitForExit();
                    }
                }
                catch (Exception ex)
                {
                    Process.Start(appUrl);
                }
            }
            else
            {
                // Fallback to system default browser
                Process.Start(appUrl);
            }

            // Clean exit: if we started the backend process, terminate it cleanly on exit
            ShutdownBackend();
        }

        private static string FindPetrosRoot(string startDir)
        {
            string current = startDir;
            for (int i = 0; i < 5; i++)
            {
                if (string.IsNullOrEmpty(current)) break;
                if (File.Exists(Path.Combine(current, "dist", "server.cjs")))
                {
                    return current;
                }
                DirectoryInfo parent = Directory.GetParent(current);
                if (parent == null) break;
                current = parent.FullName;
            }
            return null;
        }

        private static string FindNodeExecutable(string petrosDir)
        {
            // 1. Check local bundled runtime
            string localRuntime = Path.Combine(petrosDir, "runtime", "node.exe");
            if (File.Exists(localRuntime)) return localRuntime;

            // 2. Check standard Program Files
            string progFilesNode = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "nodejs",
                "node.exe"
            );
            if (File.Exists(progFilesNode)) return progFilesNode;

            string progFiles86Node = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                "nodejs",
                "node.exe"
            );
            if (File.Exists(progFiles86Node)) return progFiles86Node;

            // 3. Check AppData local
            string localAppDataNode = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "nodejs",
                "node.exe"
            );
            if (File.Exists(localAppDataNode)) return localAppDataNode;

            // 4. Check PATH environment
            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] paths = pathEnv.Split(';');
            foreach (string p in paths)
            {
                if (string.IsNullOrEmpty(p)) continue;
                string candidate = Path.Combine(p.Trim(), "node.exe");
                if (File.Exists(candidate)) return candidate;
            }

            return null;
        }

        private static void EnsureOllamaRunning()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:11434/api/tags");
                req.Timeout = 1200;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    if (resp.StatusCode == HttpStatusCode.OK)
                    {
                        return; // Ollama is already running
                    }
                }
            }
            catch
            {
                // Ollama is not answering on 11434, see if ollama.exe is installed
                string ollamaExe = FindOllamaExecutable();
                if (!string.IsNullOrEmpty(ollamaExe))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = ollamaExe;
                        psi.Arguments = "serve";
                        psi.CreateNoWindow = true;
                        psi.WindowStyle = ProcessWindowStyle.Hidden;
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                    }
                    catch { }
                }
            }
        }

        private static string FindOllamaExecutable()
        {
            string localAppDataOllama = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "Ollama",
                "ollama.exe"
            );
            if (File.Exists(localAppDataOllama)) return localAppDataOllama;

            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] paths = pathEnv.Split(';');
            foreach (string p in paths)
            {
                if (string.IsNullOrEmpty(p)) continue;
                string candidate = Path.Combine(p.Trim(), "ollama.exe");
                if (File.Exists(candidate)) return candidate;
            }
            return null;
        }

        private static bool CheckServerHealth(int port)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/health");
                req.Timeout = 1500;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static bool WaitForServerHealth(int port, int timeoutSeconds)
        {
            for (int i = 0; i < timeoutSeconds * 2; i++)
            {
                Thread.Sleep(500);
                if (CheckServerHealth(port))
                {
                    return true;
                }
                if (_backendProcess != null && _backendProcess.HasExited)
                {
                    return false;
                }
            }
            return false;
        }

        private static string FindAppBrowser()
        {
            string edge86 = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                "Microsoft", "Edge", "Application", "msedge.exe"
            );
            if (File.Exists(edge86)) return edge86;

            string edge64 = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "Microsoft", "Edge", "Application", "msedge.exe"
            );
            if (File.Exists(edge64)) return edge64;

            string chrome = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "Google", "Chrome", "Application", "chrome.exe"
            );
            if (File.Exists(chrome)) return chrome;

            string chrome86 = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                "Google", "Chrome", "Application", "chrome.exe"
            );
            if (File.Exists(chrome86)) return chrome86;

            return null;
        }

        private static void ShutdownBackend()
        {
            if (_weStartedBackend && _backendProcess != null)
            {
                try
                {
                    if (!_backendProcess.HasExited)
                    {
                        _backendProcess.Kill();
                    }
                }
                catch { }
                finally
                {
                    _backendProcess.Dispose();
                    _backendProcess = null;
                }
            }
        }
    }
}
