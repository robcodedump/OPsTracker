import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { GitBranch, ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Extract meaningful keywords from text (ignore short/common words)
const STOP_WORDS = new Set(['the','a','an','is','it','in','on','at','to','of','and','or','not','for','with','was','has','be','are','this','that','was','have','had']);

function getKeywords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

// Highlight matching text in a string
function HighlightedText({ text, highlight }) {
  if (!text || !highlight || highlight.trim() === '') return <span>{text}</span>;
  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-400 text-black rounded px-0.5 not-italic font-semibold">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// Highlight matching keywords (from current issue description) in a string
function HighlightedKeywords({ text, keywords }) {
  if (!text || keywords.length === 0) return <span>{text}</span>;
  const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5 not-italic">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function RelatedIssuesSection({ currentIssue, allIssues, allMachines }) {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const PREVIEW_COUNT = 2;

  // Find the machine for this issue
  const currentMachine = useMemo(() => {
    if (!currentIssue?.machine_id) return null;
    return allMachines.find(m => m.machine_id === currentIssue.machine_id);
  }, [currentIssue, allMachines]);

  // Find related issues: same model OR same theme, excluding this issue itself
  const relatedIssues = useMemo(() => {
    if (!currentMachine) return [];
    return allIssues
      .filter(issue => {
        if (issue.id === currentIssue.id) return false;
        const machine = allMachines.find(m => m.machine_id === issue.machine_id);
        if (!machine) return false;
        const sameModel = machine.model && currentMachine.model && machine.model === currentMachine.model;
        const sameTheme = machine.theme && currentMachine.theme && machine.theme === currentMachine.theme;
        return sameModel || sameTheme;
      })
      .sort((a, b) => new Date(b.reported_date) - new Date(a.reported_date));
  }, [currentIssue, allIssues, allMachines, currentMachine]);

  const keywords = useMemo(() => getKeywords(currentIssue?.issue_description), [currentIssue]);

  const searchFilteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return relatedIssues;
    const q = searchQuery.toLowerCase();
    return relatedIssues.filter(issue => {
      const descMatch = issue.issue_description?.toLowerCase().includes(q);
      const notesMatch = Array.isArray(issue.notes) && issue.notes.some(n => n.text?.toLowerCase().includes(q));
      return descMatch || notesMatch;
    });
  }, [relatedIssues, searchQuery]);

  if (!currentMachine || relatedIssues.length === 0) return null;

  const previewIssues = relatedIssues.slice(0, PREVIEW_COUNT);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-semibold text-purple-300">
          Related ({relatedIssues.length})
        </span>
      </div>

      <div className="space-y-2">
        {previewIssues.map(issue => (
          <RelatedIssueRow key={issue.id} issue={issue} allMachines={allMachines} keywords={keywords} searchQuery="" />
        ))}
      </div>

      {relatedIssues.length > PREVIEW_COUNT && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="mt-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 text-xs px-2 min-h-[36px]"
          >
            <ChevronDown className="w-3 h-3 mr-1" />
            Show {relatedIssues.length - PREVIEW_COUNT} more related issues
          </Button>

          <Dialog open={showAll} onOpenChange={(open) => { setShowAll(open); if (!open) setSearchQuery(''); }}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-purple-400" />
                      All Related Issues ({relatedIssues.length})
                    </DialogTitle>
                    <p className="text-slate-400 text-sm mt-1">
                      Same model ({currentMachine.model}){currentMachine.theme ? ` or theme (${currentMachine.theme})` : ''} — across all casinos
                    </p>
                  </div>
                  <div className="relative w-full sm:w-56 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search issues & notes..."
                      className="pl-9 h-11 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 space-y-2 pr-1 mt-2">
                {searchFilteredIssues.length > 0 ? (
                  searchFilteredIssues.map(issue => (
                    <RelatedIssueRow key={issue.id} issue={issue} allMachines={allMachines} keywords={keywords} searchQuery={searchQuery} />
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No issues match "{searchQuery}"
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function RelatedIssueRow({ issue, allMachines, keywords = [], searchQuery = '' }) {
  const machine = allMachines.find(m => m.machine_id === issue.machine_id);

  // Find notes that match the search query
  const matchingNotes = searchQuery.trim()
    ? (issue.notes || []).filter(n => n.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="px-3 py-2 bg-slate-700/40 rounded-lg border border-purple-900/40 hover:border-purple-700/50 transition-colors">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <Link
          to={createPageUrl(`MachineDetail?id=${issue.machine_id}`)}
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          {issue.area}-{issue.section}-{issue.location}
        </Link>
        <Badge className={`text-xs border ${issue.resolved ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-orange-900/40 text-orange-300 border-orange-700'}`}>
          {issue.resolved ? 'Resolved' : 'Open'}
        </Badge>
        {machine?.theme && (
          <Badge className="text-xs bg-purple-900/40 text-purple-300 border border-purple-700">
            {machine.theme}
          </Badge>
        )}
      </div>
      <p className="text-xs text-slate-400 line-clamp-2">
        {searchQuery.trim()
          ? <HighlightedText text={issue.issue_description} highlight={searchQuery} />
          : <HighlightedKeywords text={issue.issue_description} keywords={keywords} />
        }
      </p>
      {matchingNotes.length > 0 && (
        <div className="mt-2 space-y-1">
          {matchingNotes.map((note, i) => (
            <div key={i} className="text-xs bg-slate-600/40 rounded px-2 py-1 border border-slate-600">
              <span className="text-slate-500 mr-1">Note:</span>
              <HighlightedText text={note.text} highlight={searchQuery} />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500 mt-1">
        {format(new Date(issue.reported_date), 'MMM d, yyyy')}
        {machine && ` · ${machine.model}`}
      </p>
    </div>
  );
}