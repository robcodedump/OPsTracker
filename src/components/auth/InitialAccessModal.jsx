const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Users } from "lucide-react";

export default function InitialAccessModal({ open, onContinueAnonymous }) {
  const handleGoogleLogin = async () => {
    await db.auth.redirectToLogin();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-slate-800 border-slate-700 text-white"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            Welcome! Please Choose Your Access Level
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-6">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Login with Google
          </Button>
          <Button 
            onClick={onContinueAnonymous}
            variant="outline"
            className="w-full h-14 text-lg border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            <Users className="w-5 h-5 mr-2" />
            Login as Site Staff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}