import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Clock, MessageSquare, ChevronDown, ChevronUp, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function RecentIssuesList({ issues, loading }) {
  const [expandedIssueId, setExpandedIssueId] = useState(null);

  const getStatusColor = (status) => {
    return status === 'in_service' 
      ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' 
      : 'bg-red-900/50 text-red-300 border-red-700';
  };

  const getStatusIcon = (status) => {
    return status === 'in_service' 
      ? <AlertTriangle className="w-4 h-4" />
      : <XCircle className="w-4 h-4" />;
  };

  const toggleExpanded = (issueId) => {
    setExpandedIssueId(expandedIssueId === issueId ? null : issueId);
  };

  return (
    <Card className="shadow-lg border border-slate-700 bg-slate-800">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="flex items-center gap-2 text-white">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Recent Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : issues.length > 0 ? (
          <div className="space-y-3">
            {issues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id;
              const hasNotes = issue.notes && Array.isArray(issue.notes) && issue.notes.length > 0;

              return (
                <div 
                  key={issue.id} 
                  className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-1">
                        <Link 
                          to={createPageUrl(`MachineDetail?id=${issue.machine_id}`)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <h4 className="font-bold text-lg text-blue-400 hover:text-blue-300 cursor-pointer mb-1">
                            {issue.area}-{issue.section}-{issue.location}
                          </h4>
                        </Link>
                        <p className="text-sm text-slate-400 mb-2">{issue.machine_id}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getStatusColor(issue.service_status)} border flex items-center gap-1`}>
                            {getStatusIcon(issue.service_status)}
                            {issue.service_status === 'in_service' ? 'In Service' : 'Out of Service'}
                          </Badge>
                          {issue.resolved && (
                            <Badge className="bg-green-900/50 text-green-300 border-green-700 border flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-sm flex-shrink-0 ml-4">
                      <Clock className="w-3 h-3" />
                      {format(new Date(issue.reported_date), 'MMM d, h:mm a')}
                    </div>
                  </div>

                  <p className="text-slate-300 text-sm">
                    {issue.issue_description}
                  </p>

                  {hasNotes && (
                    <div className="mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(issue.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 hover:bg-slate-600 p-2 h-auto"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{issue.notes.length} note{issue.notes.length !== 1 ? 's' : ''}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </Button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-700">
                          {issue.notes.map((note, index) => (
                            <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-600">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-1 text-xs text-blue-400">
                                  <User className="w-3 h-3" />
                                  <span className="font-medium">{note.author}</span>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {note.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-slate-400">No issues reported</p>
            <p className="text-sm text-slate-500">All machines are running smoothly!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}