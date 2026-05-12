
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Clock } from "lucide-react";
import { format } from "date-fns";

export default function IssueNotesTimeline({ issues }) {
  // Collect all notes from all issues and flatten into a single timeline
  const allNotes = [];
  
  issues.forEach(issue => {
    if (issue.notes && Array.isArray(issue.notes) && issue.notes.length > 0) {
      issue.notes.forEach(note => {
        allNotes.push({
          ...note,
          issueId: issue.id,
          issueDescription: issue.issue_description,
          issueStatus: issue.service_status,
          issueResolved: issue.resolved
        });
      });
    }
  });

  // Sort notes by timestamp (newest first)
  const sortedNotes = allNotes.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  if (sortedNotes.length === 0) {
    return null;
  }

  return (
    <Card className="border border-slate-700 shadow-lg bg-slate-800">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Issue Notes Timeline
          <Badge variant="outline" className="ml-2 bg-blue-900/30 text-blue-300 border-blue-700">
            {sortedNotes.length} {sortedNotes.length === 1 ? 'Note' : 'Notes'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-600"></div>
          
          <div className="space-y-4">
            {sortedNotes.map((note, index) => (
              <div key={`${note.issueId}-${index}`} className="relative pl-12">
                {/* Timeline dot */}
                <div className="absolute left-0 top-3 w-8 h-8 rounded-full bg-blue-900 border-4 border-slate-800 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                </div>
                
                {/* Note card */}
                <Card className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 transition-colors">
                  <CardContent className="p-4">
                    {/* Related issue info - NOW PROMINENT AT TOP */}
                    <div className="mb-3 pb-3 border-b border-slate-600">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-sm font-semibold text-slate-300">Related to:</span>
                        <Badge 
                          className={`text-xs ${
                            note.issueResolved 
                              ? 'bg-green-900/50 text-green-300 border-green-700' 
                              : note.issueStatus === 'out_of_service'
                              ? 'bg-red-900/50 text-red-300 border-red-700'
                              : 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
                          } border`}
                        >
                          {note.issueResolved ? 'Resolved' : note.issueStatus === 'out_of_service' ? 'Out of Service' : 'In Service'}
                        </Badge>
                      </div>
                      <p className="text-base font-medium text-white leading-relaxed">
                        {note.issueDescription}
                      </p>
                    </div>

                    {/* Note content */}
                    <p className="text-slate-200 leading-relaxed mb-3">
                      {note.text}
                    </p>

                    {/* Author and timestamp - NOW LESS PROMINENT AT BOTTOM */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-600">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <User className="w-3 h-3" />
                        <span>{note.author}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
