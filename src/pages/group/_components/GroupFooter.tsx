import { Link } from "react-router-dom";

export default function GroupFooter() {
  return (
    <footer className="bg-[#111111] py-10">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
        <span>&copy; {new Date().getFullYear()} Geodata Group. All rights reserved.</span>
        <div className="flex items-center gap-5">
          <Link to="/real-estate" className="hover:text-white transition-colors">Real Estate Site</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
