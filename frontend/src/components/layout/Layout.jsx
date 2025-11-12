import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function Layout({ children }) {
    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <Sidebar />

            {/* Main area */}
            <div className="flex-1 flex flex-col">
                <Topbar />

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;
