import React from 'react';
import { Button } from "@/components/ui/button";
import { Users, LogIn } from "lucide-react";

export default function AnonymousBanner({ onSignIn }) {
  return (
    <div className="bg-blue-900/30 border-b border-blue-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-blue-200 font-medium">
            Logged in as Site Staff
          </span>
        </div>
        <Button 
          onClick={onSignIn}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In for Full Access
        </Button>
      </div>
    </div>
  );
}