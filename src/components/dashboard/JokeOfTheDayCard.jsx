const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smile, RefreshCw } from "lucide-react";

export default function JokeOfTheDayCard() {
  const [joke, setJoke] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDailyJoke();
  }, []);

  const loadDailyJoke = async () => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('joke_date');
    const storedJoke = localStorage.getItem('joke_content');

    // If we already have a joke for today, use it
    if (storedDate === today && storedJoke) {
      setJoke(storedJoke);
      return;
    }

    // Otherwise, fetch a new joke
    await fetchNewJoke();
  };

  const fetchNewJoke = async () => {
    setLoading(true);
    try {
      const response = await db.integrations.Core.InvokeLLM({
        prompt: "Tell me a short, clean, work-appropriate joke that would be suitable for a professional casino maintenance team dashboard. Keep it light, friendly, and safe for work. Just provide the joke itself, no introduction or explanation.",
        add_context_from_internet: false
      });

      const jokeText = typeof response === 'string' ? response : response.joke || 'Why did the slot machine go to therapy? It had too many issues!';
      
      setJoke(jokeText);
      
      // Store the joke and date
      const today = new Date().toDateString();
      localStorage.setItem('joke_date', today);
      localStorage.setItem('joke_content', jokeText);
    } catch (error) {
      console.error('Error fetching joke:', error);
      setJoke('Why did the slot machine go to therapy? It had too many issues! 🎰');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border border-slate-700 bg-slate-800">
      <CardHeader className="border-b border-slate-700">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-white">
            <Smile className="w-5 h-5 text-yellow-400" />
            Joke of the Day
          </CardTitle>
          <Button
            onClick={fetchNewJoke}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            New Joke
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          </div>
        ) : (
          <p className="text-slate-300 text-lg leading-relaxed italic">
            {joke}
          </p>
        )}
      </CardContent>
    </Card>
  );
}