import React, { useMemo, useState, useEffect, createContext, useContext, useRef, useCallback } from "react";
import { ArrowBigUp, ArrowBigDown, MessageSquare, Atom, Link as LinkIcon, Quote, Wand2, Plus, Flame, Clock, Star, Search, Tag, Menu, Send, BookOpen, Video, LogIn, ChevronLeft, ChevronRight, Loader2, X, Check, AlertCircle, Info, ChevronDown, ChevronUp, Copy, Trash2, Bot, Sparkles, Sun, Moon, Monitor, FileText, Link2, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

// shadcn/ui
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "./components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "./components/ui/sheet";
import { Skeleton } from "./components/ui/skeleton";
import { Toaster } from "./components/ui/sonner";
import { ScrollArea } from "./components/ui/scroll-area";
import bcrypt from "bcryptjs";
import { GoogleOAuthProvider, useGoogleLogin, CredentialResponse, GoogleLogin } from "@react-oauth/google";
import axios from "axios";

/**
 * InspireLens – Professional Content Sharing Platform
 * Optimized with efficient state updates for voting and comments
 */

// Theme Context
const ThemeContext = createContext({
  theme: "system",
  setTheme: (_theme: any) => {},
});

const CLIENT_ID = "942589748245-hvrpckombpd3bsnknp46fltgpilnb14b.apps.googleusercontent.com";
const API_BASE_URL = 'http://localhost:8080';

class ApiService {
  static async request(endpoint: string, options: RequestInit & { headers?: Record<string, string> } = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const user = JSON.parse(localStorage.getItem("inspirelens_user") || "null");
    if (user?.token) {
      defaultHeaders['Authorization'] = `Bearer ${user.token}`;
    }

    const mergedHeaders: Record<string, string> = {
      ...defaultHeaders,
      ...(options.headers || {}),
    };

    const config: RequestInit = {
      ...options,
      headers: mergedHeaders as HeadersInit,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  static async get(endpoint: string, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  static async post(endpoint: string, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put(endpoint: string, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  static async getAllPosts() {
    return this.get('/');
  }

  static async getAllCategories() {
    return this.get('/categories');
  }

  static async getContentByCategory(category: string, page = 1, type = 'all') {
    return this.get('/content-type', { 
      category: category === 'all' ? undefined : category,
      type: type === 'all' ? undefined : type,
      page,
      limit: ITEMS_PER_PAGE
    });
  }

  static async getContentByType(type: React.SetStateAction<string>, page = 1, category = 'all') {
    return this.get('/content-type', { 
      type: type === 'all' ? undefined : type,
      category: category === 'all' ? undefined : category,
      page,
      limit: ITEMS_PER_PAGE 
    });
  }

  static async login(credentials: {} | undefined) {
    return this.post('/auth/login', credentials);
  }

  static async checkEmail(email: { email: any; }) {
    return this.get('/auth/check-email', email);
  }

  static async signup(userData: {} | undefined) {
    return this.post('/auth/signup', userData);
  }

  static async googleAuth(response: CredentialResponse) {
    const idToken = response.credential;
    return this.post("/auth/google", { tokenId: idToken });
  }

  static async forgotPassword(email: any) {
    return this.post('/auth/forgot-password', { email });
  }

  static async logout() {
    return this.post('/auth/logout');
  }

  static async updateTheme(theme: string, userId: string): Promise<UpdateThemeResponse> {
    const response = await this.put('/auth/theme', { theme, userId });
    return response;
  }

  static async vote(contentId: any, contentType: any, voteType: 'upvote' | 'downvote', userId: any) {
    return this.put(`/content-type/${contentId}/vote`, { 
      contentType,
      voteType,
      userId 
    });
  }

  static async addComment(contentId: any, postType: any, comment: any, userId: any) {
    return this.post(`/posts/${contentId}/comments`, {
      comment: comment,
      postType: postType,
      userId: userId
    });
  }

  static async deleteComment(contentId: any, commentId: any, userId: any) {
    return this.delete(`/posts/deleteComment/${contentId}/comments/${commentId}?userId=${userId}`);
  }

  static async createContent(contentData: {} | undefined) {
    return this.post('/posts/addContent', contentData);
  }
}

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("inspirelens-theme") || "system";
    }
    return "system";
  });

  const updateTheme = async (newTheme: string) => {
    const user = JSON.parse(localStorage.getItem("inspirelens_user") || "null");
    const userId = user?.id;

    if (!userId) {
      setTheme(newTheme);
      return;
    }

    try {
      setTheme(newTheme);
      const response = await ApiService.updateTheme(newTheme, userId);
      user.mode = newTheme;
      localStorage.setItem("inspirelens_user", JSON.stringify(user));
      showSuccessToast("Theme updated successfully!");
    } catch (error: any) {
      console.error("Failed to update theme:", error);
      showErrorToast("Theme updated locally, but failed to sync with server");
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem("inspirelens-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: updateTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

const CATEGORIES = await (async () => {
  try {
    const response = await ApiService.getAllCategories();
    return response.categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
})();

const TYPE_META = {
  quote: { icon: <Quote className="w-4 h-4" />, label: "Quote", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500" },
  prompt: { icon: <Wand2 className="w-4 h-4" />, label: "AI Prompt", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500" },
  article: { icon: <LinkIcon className="w-4 h-4" />, label: "Article", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500" },
  book: { icon: <BookOpen className="w-4 h-4" />, label: "Book", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500" },
  video: { icon: <Video className="w-4 h-4" />, label: "Video", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 border-slate-300 dark:bg-slate-700 dark:border-slate-500" },
};

const ITEMS_PER_PAGE = 10;

interface UpdateThemeResponse {
  message: string;
  theme: string;
}

function postLenght(postCounts: any) {
  const total =
    postCounts[0].article_count +
    postCounts[0].aiprompt_count +
    postCounts[0].book_count +
    postCounts[0].quote_count +
    postCounts[0].video_count;
  return total;
}

const initialItems: any[] = await (async () => {
  try {
    const posts = await ApiService.getAllPosts();
    const totalItems = postLenght(posts.posts);

    const itemsArray = Array.from({ length: totalItems }, (_, i) => {
      const post = posts.posts[i];
      return post
        ? {
            id: post.id,
            type: post.type,
            title: post.title || post.content || `Item ${i + 1}`,
            content: post.content || "",
            author: post.author || "",
            url: post.url || "",
            category_id: post.category_id || "",
            category: post.category_name || "",
            points: post.points || null,
            points_count: post.points_count || 0,
            tags: post.tags || [],
            views: post.views || 0,
            comments: post.comments || [],
            user: post.username || "",
            createdAt: post.created_at || Date.now(),
          }
        : {
            id: null,
            type: "",
            title: "",
            content: "",
            author: "",
            url: "",
            category: "",
            points: null,
            points_count: 0,
            tags: [],
            views: 0,
            comments: [],
            user: "",
            createdAt: null,
          };
    });

    return itemsArray;
  } catch (e) {
    console.log(e);
    return [];
  }
})();

// Utilities
function domainFromUrl(url = "") {
  try {
    if (!url) return "";
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

function timeAgo(ts?: string | number) {
  if (!ts) return "0s ago";

  const timestamp = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (isNaN(timestamp)) return "0s ";

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  const intervals = [
    { label: "y", secs: 31536000 },
    { label: "mo", secs: 2592000 },
    { label: "d", secs: 86400 },
    { label: "h", secs: 3600 },
    { label: "m", secs: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(deltaSeconds / interval.secs);
    if (count >= 1) return `${count}${interval.label}`;
  }

  return `${deltaSeconds}s`;
}

function formatNumber(num: number) {  
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function simulateDelay(delay = 300) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  if (typeof password !== "string") return false;
  return password.length >= 8 && /(?=.*[a-zA-Z])(?=.*\d)/.test(password);
}

function validateUsername(username: string) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validateUrl(url: string) {
  try {
    if (!url || url.trim() === "") return false;
    const urlObj = new URL(url.trim());
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

// Toast Utilities
const showSuccessToast = (message: string | number | bigint | boolean | (() => React.ReactNode) | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined) => {
  toast.success(message, {
    duration: 4000,
    style: {
      background: '#475569',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
    },
  });
};

const showInfoToast = (message: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | (() => React.ReactNode) | null | undefined) => {
  toast.info(message, {
    duration: 3000,
    style: {
      background: '#64748b',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
    },
  });
};

// function showErrorToast(message: string) {
//   toast.error(message, {
//     duration: 4000,
//     style: {
//       background: '#dc2626',
//       color: 'white',
//       border: 'none',
//       borderRadius: '8px',
//     },
//   });
// }

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    }
  } catch (error) {
    console.log('Clipboard API not available, using fallback');
  }
  
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    textArea.remove();
    
    return { success: successful, method: 'execCommand' };
  } catch (error) {
    return { success: false, error };
  }
}

// Skeleton Components
function SkeletonCard() {
  return (
    <Card className="w-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-10 h-6 rounded" />
            <Skeleton className="w-6 h-4" />
            <Skeleton className="w-10 h-6 rounded" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-16 h-5 rounded" />
              <Skeleton className="w-12 h-5 rounded" />
              <Skeleton className="w-20 h-3" />
            </div>
            <Skeleton className="w-full h-6" />
            <Skeleton className="w-4/5 h-3" />
            <Skeleton className="w-3/5 h-3" />
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="w-16 h-5" />
              <Skeleton className="w-12 h-5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Logo Component
function InspireLensLogo({ size = "md" }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  return (
    <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 dark:from-slate-200 dark:via-slate-300 dark:to-slate-100 grid place-items-center shadow-lg relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent dark:via-black/10"></div>
      <div className="relative flex items-center justify-center">
        <div className="absolute w-3 h-3 bg-white/90 dark:bg-slate-800/90 rounded-full animate-pulse"></div>
        <div className="w-6 h-6 border-2 border-white/80 dark:border-slate-800/80 rounded-full flex items-center justify-center">
          <Atom className="w-3 h-3 text-white/90 dark:text-slate-800/90" />
        </div>
      </div>
    </div>
  );
}

// Theme Toggle Component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Types
interface Vote {
  id: number;
  user_id: number;
  username: string;
  vote_type: "up" | "down";
  created_at: string;
}

interface VoteColumnProps {
  points: number;
  postType: string;
  onUp: () => void;
  onDown: () => void;
  voted: number;
  pointsUser: Vote[];
}

function VoteColumn({
  points,
  postType,
  onUp,
  onDown,
  voted,
  pointsUser,
}: VoteColumnProps) {
  const currentUser = JSON.parse(localStorage.getItem("inspirelens_user") || "null");
  const userVote = pointsUser.find((vote) => vote.user_id === currentUser?.id);
  postType = postType.toLowerCase();
  voted = userVote?.vote_type === "up" ? 1 : userVote?.vote_type === "down" ? -1 : 0;

  return (
    <motion.div
      className="flex flex-col items-center gap-2 min-w-[50px]"
      whileHover={{ scale: 1.02 }}
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant={userVote?.vote_type === "up" ? "default" : "outline"}
          size="sm"
          className={`w-10 h-8 rounded transition-all duration-200 ${
            userVote?.vote_type === "up"
              ? "bg-slate-700 hover:bg-slate-800 text-white border-slate-700 dark:bg-slate-300 dark:hover:bg-slate-200 dark:text-slate-900 dark:border-slate-300"
              : "hover:bg-slate-100 hover:border-slate-400 text-slate-600 border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-500 dark:text-slate-400 dark:border-slate-600"
          }`}
          onClick={onUp}
          aria-label="Upvote"
        >
          <ArrowBigUp className="w-4 h-4" />
        </Button>
      </motion.div>

      <motion.div
        className="text-sm font-semibold tabular-nums text-center text-slate-700 dark:text-slate-300"
        key={points}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {formatNumber(points)}
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant={userVote?.vote_type === "down" ? "destructive" : "outline"}
          size="sm"
          className={`w-10 h-8 rounded transition-all duration-200 ${
            userVote?.vote_type === "down"
              ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
              : "hover:bg-slate-100 hover:border-slate-400 text-slate-600 border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-500 dark:text-slate-400 dark:border-slate-600"
          }`}
          onClick={onDown}
          aria-label="Downvote"
        >
          <ArrowBigDown className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

interface ItemCardProps {
  item: {
    id: number;
    type: string;
    points: Vote[] | null;
    points_count: number;
    url?: string;
    title?: string;
    content?: string;
    user?: string;
    author?: string;
    category?: string;
    category_name?: string;
    comments?: any[] | null;
    createdAt?: string | number;
    created_at?:string | number;
    tags?: string[] | null;
  };
  onVote: (id: number, delta: number, updatedVotes?: Vote[], postType?: string ) => void;
  onAddComment: (itemId: number, postType: string, comment: any) => Promise<void>;
  onDeleteComment: (itemId: number, commentId: number) => void;
  onRequireAuth?: () => void;
  currentUser?: { id?: number; username?: string; name?: string } | null;
  index?: number;
}

const ItemCard = React.memo(({ item, onVote, onAddComment, onDeleteComment, onRequireAuth, currentUser, index = 0 }: ItemCardProps) => {
  const normalizedType = item.type === "aiprompt" ? "prompt" : item.type;

  const meta =
    (TYPE_META as Record<
      string,
      { icon: React.ReactNode; label: string; color: string; bg: string }
    >)[normalizedType] || {
      icon: null,
      label: normalizedType,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-700",
    };

  const [voted, setVoted] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const isAuthed = !!currentUser;
  const domain = domainFromUrl(item.url);

  useEffect(() => {
    if (Array.isArray(item.points) && currentUser) {
      const existingVote = item.points.find((v: Vote) => v.user_id === currentUser.id);
      if (existingVote) {
        setVoted(existingVote.vote_type === "up" ? 1 : -1);
      } else {
        setVoted(0);
      }
    } else {
      setVoted(0);
    }
  }, [item.points, currentUser]);

  const handleVote = useCallback(async (dir: number) => {
    if (!isAuthed) {
      onRequireAuth?.();
      return;
    }

    const voteType = dir === 1 ? "upvote" : "downvote";
    let newVotedState: number;
    let pointsDelta: number;

    if (dir === 1) {
      if (voted === 1) {
        newVotedState = 0;
        pointsDelta = -1;
      } else if (voted === -1) {
        newVotedState = 1;
        pointsDelta = 2;
      } else {
        newVotedState = 1;
        pointsDelta = 1;
      }
    } else {
      if (voted === -1) {
        newVotedState = 0;
        pointsDelta = 1;
      } else if (voted === 1) {
        newVotedState = -1;
        pointsDelta = -2;
      } else {
        newVotedState = -1;
        pointsDelta = -1;
      }
    }

    const previousVoted = voted;
    setVoted(newVotedState);
    onVote(item.id, pointsDelta);

    try {
      const response = await ApiService.vote(item.id, item.type, voteType, currentUser!.id);

      if (!Array.isArray(response) || response.length === 0) {
        pointsDelta = pointsDelta - 1;
        onVote(item.id, pointsDelta, response, item.type);
      } else {
        const exists = item.points?.some(
          (point: Vote) =>
            point.id === response[0].id &&
            point.user_id === response[0].user_id &&
            point.username === response[0].username &&
            point.vote_type !== response[0].vote_type
        ) ?? false;

        if (exists) {
          if (pointsDelta > 0) {
            pointsDelta = pointsDelta - 1;
          } else if (pointsDelta < 0) {
            pointsDelta = pointsDelta + 1;
          }
        }

        onVote(item.id, pointsDelta, response, item.type);

        if (newVotedState !== 0) {
          showInfoToast("Vote recorded successfully!");
        }
      }
    } catch (error) {
      console.error("❌ Failed to vote:", error);
      showErrorToast("Failed to record vote. Please try again.");
      
      setVoted(previousVoted);
      onVote(item.id, -pointsDelta);
    }
  }, [voted, isAuthed, currentUser, item.id, item.type, item.points, onVote, onRequireAuth]);

  const handleCopyUrl = async () => {
    const urlToCopy = item.url || window.location.href;
    const result = await copyToClipboard(urlToCopy);
    
    if (result.success) {
      showSuccessToast("URL copied to clipboard!");
    } else {
      showInfoToast("Unable to copy URL. Please copy manually.");
    }
  };

  const handleCopyText = async () => {
    const validTypes = ["quote", "book", "aiprompt"];
    const textToCopy =
      validTypes.includes(item.type) ? item.title ?? item.content ?? "" : "";

    const result = await copyToClipboard(textToCopy);

    if (result?.success) {
      showSuccessToast("Text copied to clipboard!");
    } else {
      showInfoToast("Unable to copy text. Please copy manually.");
    }
  };

  const handleAddComment = useCallback(async () => {
    if (!isAuthed) {
      onRequireAuth?.();
      return;
    }
    const text = commentText.trim();
    if (!text) return;

    await onAddComment(item.id, item.type, {
      id: Date.now(),
      user: `@${currentUser!.username}`,
      userId: currentUser!.id,
      text,
      created_at: Date.now(),
      createdBy: `@${currentUser!.username}`,
    });
    setCommentText("");
    showSuccessToast("Comment added!");
  }, [commentText, isAuthed, currentUser, item.id, item.type, onAddComment, onRequireAuth]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!isAuthed) {
      onRequireAuth?.();
      return;
    }
    try {
      const response = await ApiService.deleteComment(item.id, commentId, currentUser!.id);
      if (response) {
        onDeleteComment(item.id, commentId);
        showSuccessToast("Comment deleted!");
      }
    } catch (error) {
      console.error("❌ Failed to delete comment:", error);
      showErrorToast("Failed to delete comment. Please try again.");
    }
  }, [isAuthed, currentUser, item.id, onDeleteComment, onRequireAuth]);

const openInChatGPT = async (event : any) => {
  // Prevent default behavior if this is inside a form or link
  event?.preventDefault();
  event?.stopPropagation();

  const content = item?.content?.trim();
  if (!content) {
    console.warn("⚠️ No valid content found in item.");
    return;
  }

  // Encode the content for safe URL usage
  const prompt = encodeURIComponent(content);
  
  // Use ?q= so ChatGPT search bar is prefilled correctly
  const chatGPTUrl = `https://chatgpt.com/?q=${prompt}`;
  const cleanedUrl = chatGPTUrl.endsWith('.') ? chatGPTUrl.slice(0, -1) : chatGPTUrl;

  console.log("🧠 Encoded Prompt:", prompt);
  console.log("🌐 Opening URL:", cleanedUrl);
  const result = await copyToClipboard(cleanedUrl);

  if (result?.success) {
    showSuccessToast("URL copied to clipboard!");
  }

  // Open ChatGPT in a new tab — does NOT change current tab URL
  console.log(window.location);
  
  // setTimeout(() => {
  //    window.open(cleanedUrl, "_blank", "noopener,noreferrer,nohistory");
  // },1000)
  // window.open(cleanedUrl, "_blank", "noopener,noreferrer");
};




  const openInPerplexity = () => {
    if (item.content) {
      window.open(`https://www.perplexity.ai/search/new?q=${item.content}`, '_blank');
    }
  };

  const commentsArray = Array.isArray(item.comments) ? item.comments : [];
  console.log(item.type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="w-full"
    >
      <Card className="group hover:shadow-md transition-all duration-200 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <VoteColumn
              points={item.points_count || 0}
              postType={item.type}
              onUp={() => handleVote(1)}
              onDown={() => handleVote(-1)}
              voted={voted}
              pointsUser={Array.isArray(item.points) ? item.points : (typeof item.points === 'number' ? [] : item.points !== null ? [item.points as Vote] : [])}
            />
            
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${meta.bg} ${meta.color} border px-2 py-1 text-xs`}>
                  {meta.icon}
                  <span className="ml-1">{meta.label}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="capitalize px-2 py-1 text-xs border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                >
                  {(() => {
                    const toCapitalize = (str: string | undefined | null) => {
                      if (!str) return "";
                      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                    };

                    const matchedCategory = CATEGORIES.find((c: any) => {
                      const changedCategory = toCapitalize(c._id);
                      const isMatch =
                        changedCategory === toCapitalize(item.category) ||
                        changedCategory === toCapitalize(item.category_name);
                      return isMatch;
                    });

                    const displayCategory = toCapitalize(
                      item.category || item.category_name || "Unknown"
                    );

                    return (
                      <>
                        {matchedCategory?.icon && <span className="mr-1">{matchedCategory.icon}</span>}
                        {displayCategory}
                      </>
                    );
                  })()}
                </Badge>
                
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ml-auto">
                  <span className="font-medium hidden sm:inline">{item.user}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{timeAgo(item.created_at || item.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:hidden">
                <span className="font-medium">{item.user}</span>
                <span>•</span>
                <span>{timeAgo(item.created_at || item.createdAt)}</span>
              </div>

              <div className="space-y-1">
                {item.type === "article" || item.type === "video" ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block group/link"
                  >
                    <h2 className="text-base sm:text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100 group-hover/link:text-slate-700 dark:group-hover/link:text-slate-300 transition-colors duration-200">
                      {item.title || item.content}
                    </h2>
                    {domain && (
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        🔗 {domain}
                      </span>
                    )}
                  </a>
                ) : (
                  <h2 className="text-base sm:text-lg font-semibold leading-tight text-slate-900 dark:text-slate-100">
                    {item.title || item.content}
                  </h2>
                )}
              </div>

              {item.author && (item.type === "book" || item.type === "quote") && (
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  — {item.author}
                </p>
              )}

              {item.type === "aiprompt" && (
                <div className="flex flex-col sm:flex-row md:flex-row gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openInChatGPT}
                    className="flex items-center gap-2 text-xs border-green-300 hover:bg-green-50 hover:border-green-400 dark:border-green-600 dark:hover:bg-green-900 dark:hover:border-green-500"
                  >
                    <Bot className="w-3 h-3" />
                    <span>Try in ChatGPT</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openInPerplexity}
                    className="flex items-center gap-2 text-xs border-blue-300 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-600 dark:hover:bg-blue-900 dark:hover:border-blue-500"
                  >
                    <Search className="w-3 h-3" />
                    <span>Try in Perplexity</span>
                  </Button>
                </div>
              )}

              {Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag, index) => (
                    <Badge
                      key={`${tag}-${index}`}
                      variant="secondary"
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer text-xs text-slate-600 dark:text-slate-300"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    onClick={() => setCommentsOpen(!commentsOpen)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-medium">{item.comments?.length || 0}</span>
                    {commentsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </motion.button>
                  
                  {(item.type === "video" || item.type === "article") && item.url && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      onClick={handleCopyUrl}
                      title="Copy URL"
                    >
                      <Link2 className="w-4 h-4" />
                      <span className="text-xs font-medium hidden sm:inline">Copy URL</span>
                    </motion.button>
                  )}

                  {(item.type === "book" || item.type === "aiprompt" || item.type === "quote") && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      onClick={handleCopyText}
                      title="Copy Text"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-medium hidden sm:inline">Copy Text</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {commentsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
              >
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Comments ({Array.isArray(item.comments) ? item.comments.length : 0})
                  </h4>
                  
                  {commentsArray.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">
                      No comments yet. Start the conversation!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-3">
                          {(showAllComments ? commentsArray : commentsArray.slice(0, 3)).map((comment, index) => (
                            <div
                              key={`${comment?.id}-${index}`}
                              className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                {comment?.username ? comment.username.replace("@", "").slice(0, 2).toUpperCase() : comment?.user ? comment.user.replace("@", "").slice(0, 2).toUpperCase() : "NA"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{comment?.username || comment?.user || "Unknown"}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(comment?.created_at || comment?.createdAt)} ago</span>
                                  {currentUser && comment?.username === currentUser.username && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="ml-auto p-1 h-auto text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 text-sm break-words">{comment?.comment || comment?.text || ""}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      {commentsArray.length > 3 && (
                        <div className="flex justify-center pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllComments(!showAllComments)}
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="text-xs">
                              {showAllComments 
                                ? "Show Less" 
                                : `Show ${commentsArray.length - 3} more comments`
                              }
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <div className="w-7 h-7 rounded-full bg-slate-500 dark:bg-slate-400 flex items-center justify-center text-white dark:text-slate-900 font-medium text-xs flex-shrink-0">
                      {currentUser?.username
                        ? currentUser.username.slice(0, 2).toUpperCase()
                        : currentUser?.name
                        ? currentUser.name.slice(0, 2).toUpperCase()
                        : "?"}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={isAuthed ? "Add a comment..." : "Log in to comment"}
                        disabled={!isAuthed}
                        className="flex-1 border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400 rounded text-sm h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleAddComment}
                        disabled={!isAuthed || !commentText.trim()}
                        size="sm"
                        className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-300 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-3 rounded h-8 flex-shrink-0"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.points_count === nextProps.item.points_count &&
    prevProps.item.comments?.length === nextProps.item.comments?.length &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    JSON.stringify(prevProps.item.points) === JSON.stringify(nextProps.item.points)
  );
});

function ContentTypeFilter({ activeType, onTypeChange }: { activeType: string; onTypeChange: (type: string) => void }) {
  const handleTypeChange = (type: string) => {
    onTypeChange(type);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTypeChange("all")}
          className={`transition-all duration-200 ${
            activeType === "all" 
              ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200" 
              : "hover:bg-slate-100 border-slate-300 dark:hover:bg-slate-700 dark:border-slate-600"
          }`}
        >
          All Types
        </Button>

        {Object.entries(TYPE_META).map(([key, meta], index) => {
          if(key === "prompt"){
            key = "aiprompt"
          }
          const isActive = activeType === key;

          return (
            <Button
              key={`${key}-${index}`}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange(key)}
              className={`flex items-center gap-1 transition-all duration-200 ${
                isActive
                  ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200"
                  : "hover:bg-slate-100 border-slate-300 dark:hover:bg-slate-700 dark:border-slate-600"
              }`}
            >
              {meta.icon}
              <span className="text-xs">{meta.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface SidebarProps {
  activeCategory: string | number;
  setActiveCategory?: (categoryId: string | number) => void;
  onCategoryChange: (categoryId: string | number) => void;
  isLoading?: boolean;
}

function Sidebar({
  activeCategory,
  onCategoryChange,
  isLoading = false,
}: SidebarProps) {
  const normalizedCategory =
    activeCategory === "all"
      ? 1
      : typeof activeCategory === "string"
      ? parseInt(activeCategory)
      : activeCategory;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Categories
        </h3>

        <div className="space-y-1">
          {CATEGORIES.map((category: any, index: number) => (
            <motion.div
              key={`${category.id}-${index}`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button
                variant={
                  normalizedCategory === category.id ? "default" : "ghost"
                }
                className={`w-full justify-start text-left h-auto p-3 rounded transition-all duration-200 ${
                  normalizedCategory === category.id
                    ? "bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900"
                    : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
                }`}
                onClick={() => onCategoryChange(category.id)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{category.icon}</span>
                  <span className="font-medium text-sm">{category.name}</span>
                  {isLoading && normalizedCategory === category.id && (
                    <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                  )}
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      <Card className="bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm">
            💡 Community Tips
          </h4>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Share crisp, compelling titles that capture attention</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>
                For prompts: include role, constraints, and expected output
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-500">•</span>
              <span>Vote based on value and quality, not just popularity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MobileCategorySidebar(props: SidebarProps) {
  const { activeCategory, onCategoryChange, isLoading } = props;
  const [open, setOpen] = useState(false);

  const handleCategoryChange = (categoryId: string | number) => {
    onCategoryChange?.(categoryId);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden flex items-center gap-2">
          <Menu className="w-4 h-4" />
          <span className="text-sm">Categories</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 dark:bg-slate-800">
        <SheetHeader>
          <SheetTitle className="dark:text-slate-200">Categories</SheetTitle>
          <SheetDescription className="dark:text-slate-400">
            Select a category to filter inspirational content
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <div className="space-y-2">
            {CATEGORIES.map((category: any, index: number) => (
              <motion.div key={`${category._id}-${index}`} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant={activeCategory === category.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left h-auto p-3 rounded transition-all duration-200 ${
                    activeCategory === category.id 
                      ? "bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900" 
                      : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
                  }`}
                  onClick={() => handleCategoryChange(category.id)}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{category.icon}</span>
                    <span className="font-medium text-sm">{category.name}</span>
                    {isLoading && activeCategory === category.id && (
                      <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                    )}
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}: PaginationProps): React.ReactElement | null {
  const getPageNumbers = () => {
    const pages: number[] = [];
    const visiblePages = 5;

    let start = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let end = Math.min(totalPages, start + visiblePages - 1);

    if (end - start < visiblePages - 1) {
      start = Math.max(1, end - visiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-8 select-none">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="w-8 h-8 rounded border-slate-300 dark:border-slate-600"
      >
        <ChevronLeft className="w-3 h-3" />
      </Button>

      {getPageNumbers().map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
          disabled={isLoading}
          className={`w-8 h-8 rounded transition-all duration-150 ${
            page === currentPage
              ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200"
              : "border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          }`}
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="w-8 h-8 rounded border-slate-300 dark:border-slate-600"
      >
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  );
}

function Header({
  currentUser,
  onOpenAuth,
  onOpenCreateModal,
}: {
  currentUser?: { id?: number; username?: string; name?: string; mode?: string } | null;
  onOpenAuth: (mode?: string) => void;
  onOpenCreateModal?: () => void;
}) {
  if (currentUser) {
    localStorage.setItem('inspirelens-theme', currentUser.mode || 'system');
  }

  return (
    <div className="bg-slate-800 dark:bg-slate-900 text-white rounded-lg shadow-sm">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <InspireLensLogo size="md" />
            <div>
              <h1 className="text-xl font-bold">InspireLens</h1>
              <p className="text-slate-300 dark:text-slate-400 text-sm">
                Discover • Share • Grow Together
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <ThemeToggle />
            
            {currentUser && (
              <Button 
                onClick={onOpenCreateModal}
                size="sm"
                className="bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 border-slate-600 rounded px-4"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            )}
            
            {!currentUser ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onOpenAuth("login")}
                  className="text-white hover:bg-slate-700 dark:hover:bg-slate-800 rounded px-3"
                >
                  Log in
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onOpenAuth("signup")}
                  className="bg-white text-slate-800 hover:bg-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded px-3"
                >
                  Sign up
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 rounded px-3 h-8"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-600 dark:bg-slate-500 grid place-items-center text-white font-medium text-xs">
                        {((currentUser?.username ?? currentUser?.name ?? "").slice(0, 2)).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm hidden sm:inline">@{currentUser.username || currentUser.name}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg rounded-lg">
                  <DropdownMenuItem onClick={() => onOpenAuth("logout")} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900 rounded">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Create Content Modal
function CreateContentModal({
  open,
  onClose,
  onSubmit,
  currentUser,
  onRequireAuth,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: any) => void;
  currentUser?: { id?: number; username?: string; name?: string } | null;
  onRequireAuth?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<keyof typeof TYPE_META>("prompt");
  const [title, setTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [promptDetails, setPromptDetails] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const totalSteps = 3;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
   
   if(category === ""){
      newErrors.category = "Category is required";
    }
    // Type-specific validations
    if (type === "quote") {
      if (!quote.trim()) {
        newErrors.quote = "Quote is required";
      } else if (quote.trim().length < 10) {
        newErrors.quote = "Quote should be at least 10 characters";
      } else if (quote.trim().length > 500) {
        newErrors.quote = "Quote should not exceed 500 characters";
      }
      
      if (!author.trim()) {
        newErrors.author = "Author is required";
      } else if (author.trim().length < 2) {
        newErrors.author = "Author name must be at least 2 characters";
      }
    }

    if (type === "prompt") {
      if (!promptDetails.trim()) {
        newErrors.promptDetails = "AI prompt details are required";
      } else if (promptDetails.trim().length < 20) {
        newErrors.promptDetails = "Prompt should be at least 20 characters";
      } else if (promptDetails.trim().length > 2000) {
        newErrors.promptDetails = "Prompt should not exceed 2000 characters";
      }
    }

    if (type === "article" || type === "video") {
       if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }
 
      if (!url.trim()) {
        newErrors.url = "URL is required";
      } else if (!validateUrl(url.trim())) {
        newErrors.url = "Please enter a valid URL starting with http:// or https://";
      }
    }

    if (type === "book") {
        if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }
      if (!author.trim()) {
        newErrors.author = "Author is required";
      } else if (author.trim().length < 2) {
        newErrors.author = "Author name must be at least 2 characters";
      }
      
      if (url && url.trim() && !validateUrl(url.trim())) {
        newErrors.url = "Please enter a valid URL starting with http:// or https://";
      }
      
      if (!summary.trim()) {
        newErrors.summary = "Summary is required";
      } else if (summary.trim().length < 20) {
        newErrors.summary = "Summary should be at least 20 characters";
      } else if (summary.trim().length > 1000) {
        newErrors.summary = "Summary should not exceed 1000 characters";
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Simulate a brief delay for better UX
    await simulateDelay(500);

    let content = "";
    let finalAuthor = "";
    
    if (type === "quote") {
      content = quote;
      finalAuthor = author;
    } else if (type === "prompt") {
      content = promptDetails;
    } else if (type === "book") {
      content = summary;
      finalAuthor = author;
    }
    console.log(title);
    
    const payload = {
      userId: currentUser.id,
      type,
      title: title.trim(),
      content: content.trim(),
      author: finalAuthor.trim(),
      url: url.trim(),
      category,
      tags: tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
    };
    
    console.log("Submitted payload:", payload);
          const response = await ApiService.createContent(payload);
    //       console.log("Created content:", response.id);
    // if (response.id === undefined || response.id === null) {
    //   showErrorToast(response.message || "Failed to create content. Please try again.");
    //   setIsLoading(false);
    //   return;
    // }
    
    
    
    // Create the item object for local state
    const newItem = {
      id: response.id || "", // Use the ID returned from the API
      ...payload,
      points: 0,
      views: 0,
      comments: [],
      user: `@${currentUser.username}`,
      created_at: Date.now(),
    };
    console.log("New item to add:", newItem);
    
    
    onSubmit(newItem);
    
    // Reset form
    setStep(1);
    setTitle("");
    setQuote("");
    setAuthor("");
    setPromptDetails("");
    setUrl("");
    setSummary("");
    setTags("");
    setType("prompt");
    setCategory("");
    
    showSuccessToast("Content created successfully!");
    setIsLoading(false);
    onClose();
  };

  const handleClose = () => {
    if (!isLoading) {
      // Reset form state
      setStep(1);
      setType("prompt");
      setTitle("");
      setQuote("");
      setAuthor("");
      setPromptDetails("");
      setUrl("");
      setSummary("");
      setCategory("");
      setTags("");
      setErrors({});
      onClose();
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Choose Content Type";
      case 2: return "Add Your Content";
      case 3: return "Categorize & Share";
      default: return "Create Content";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return "What type of inspirational content would you like to share?";
      case 2: return "Fill in the details for your content";
      case 3: return "Choose a category and add tags to help others discover your content";
      default: return "";
    }
  };

  const renderTypeSpecificFields = () => {
    switch (type) {
      case "quote":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Quote Content *
              </Label>
              <Textarea
                id="quote"
                rows={4}
                value={quote}
                onChange={(e) => {
                  setQuote(e.target.value);
                  setTitle(e.target.value.slice(0, 100)); // Sync title with quote
                  if (errors.quote) setErrors(prev => ({ ...prev, quote: null }));
                }}
                placeholder="Enter the inspiring quote..."
                className={`border rounded-lg transition-colors resize-none text-base ${
                  errors.quote ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                }`}
                disabled={isLoading}
              />
              {errors.quote && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.quote}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Author *
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (errors.author) setErrors(prev => ({ ...prev, author: null }));
                }}
                placeholder="Who said this quote?"
                className={`h-12 border rounded-lg transition-colors text-base ${
                  errors.author ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                }`}
                disabled={isLoading}
              />
              {errors.author && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.author}
                </motion.p>
              )}
            </div>
          </div>
        );

      case "prompt":
        return (
          <div className="space-y-2">
            <Label htmlFor="promptDetails" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              AI Prompt Content *
            </Label>
            <Textarea
              id="promptDetails"
              rows={8}
              value={promptDetails}
              onChange={(e) => {
                setPromptDetails(e.target.value);
                setTitle(e.target.value.slice(0, 100)); // Sync title with prompt (first 60 chars)
                if (errors.promptDetails) setErrors(prev => ({ ...prev, promptDetails: null }));
              }}
              placeholder="Write your AI prompt here. Be specific about the role, context, instructions, and expected output format..."
              className={`border rounded-lg transition-colors resize-none text-base ${
                errors.promptDetails ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
              }`}
              disabled={isLoading}
            />
            {errors.promptDetails && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-600 text-sm flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {errors.promptDetails}
              </motion.p>
            )}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Tip:</strong> Write your complete AI prompt here. Include the role, context, specific instructions, and expected output format for best results.
              </p>
            </div>
          </div>
        );

      case "article":
     case "video":
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Title *
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value.slice(0, 100));
            if (errors.title) setErrors(prev => ({ ...prev, title: null }));
          }}
          placeholder="Enter a compelling title that captures attention..."
          className={`h-12 border rounded-lg transition-colors text-base ${
            errors.title
              ? "border-red-300 focus:border-red-500"
              : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
          }`}
          disabled={isLoading}
        />
        {errors.title && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.title}
          </motion.p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {type === "article" ? "Article" : "Video"} URL *
        </Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setTitle(e.target.value.slice(0, 100)); // Sync title with URL (first 60 chars)
            if (errors.url) setErrors(prev => ({ ...prev, url: null }));
          }}
          placeholder={`https://example.com/${type === "article" ? "article" : "watch"}`}
          className={`h-12 border rounded-lg transition-colors text-base ${
            errors.url
              ? "border-red-300 focus:border-red-500"
              : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
          }`}
          disabled={isLoading}
        />
        {errors.url && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.url}
          </motion.p>
        )}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs text-green-700 dark:text-green-300">
            🔗 Share a link to an inspiring {type} that others will find valuable.
          </p>
        </div>
      </div>
    </>
  );


      case "book":
        return (
          <>
          <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value.slice(0, 100));
                        if (errors.title) setErrors(prev => ({ ...prev, title: null }));
                      }}
                      placeholder="Enter a compelling title that captures attention..."
                      className={`h-12 border rounded-lg transition-colors text-base ${
                        errors.title ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                      }`}
                      disabled={isLoading}
                    />
                    {errors.title && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-600 text-sm flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {errors.title}
                      </motion.p>
                    )}
                  </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="author" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Author *
              </Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (errors.author) setErrors(prev => ({ ...prev, author: null }));
                }}
                placeholder="Who wrote this book?"
                className={`h-12 border rounded-lg transition-colors text-base ${
                  errors.author ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                }`}
                disabled={isLoading}
              />
              {errors.author && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.author}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Summary & Key Insights *
              </Label>
              <Textarea
                id="summary"
                rows={5}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (errors.summary) setErrors(prev => ({ ...prev, summary: null }));
                }}
                placeholder="Share the key insights, main takeaways, and why this book is valuable..."
                className={`border rounded-lg transition-colors resize-none text-base ${
                  errors.summary ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                }`}
                disabled={isLoading}
              />
              {errors.summary && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.summary}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Book Link (optional)
              </Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errors.url) setErrors(prev => ({ ...prev, url: null }));
                }}
                placeholder="https://example.com/book-link"
                className={`h-12 border rounded-lg transition-colors text-base ${
                  errors.url ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                }`}
                disabled={isLoading}
              />
              {errors.url && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors.url}
                </motion.p>
              )}
            </div>
          </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-xl rounded-xl max-h-[95vh] overflow-y-auto">
        <div className="relative">
          {/* Beautiful Header with Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
            <div className="relative">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <InspireLensLogo size="md" />
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      Share Your Inspiration
                    </DialogTitle>
                    <DialogDescription className="text-slate-300 dark:text-slate-400 text-sm">
                      Create content that inspires and empowers others
                    </DialogDescription>
                  </div>
                </div>
                
                {/* Progress Steps */}
                <div className="flex items-center gap-2 mt-4">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div key={i} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                        i + 1 === step 
                          ? "bg-white text-slate-800 shadow-lg" 
                          : i + 1 < step 
                          ? "bg-green-500 text-white"
                          : "bg-slate-600 dark:bg-slate-700 text-slate-300"
                      }`}>
                        {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className={`w-12 h-0.5 mx-2 transition-all duration-300 ${
                          i + 1 < step ? "bg-green-500" : "bg-slate-600 dark:bg-slate-700"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-3">
                  <h3 className="font-semibold text-lg">{getStepTitle()}</h3>
                  <p className="text-slate-300 dark:text-slate-400 text-sm">{getStepDescription()}</p>
                </div>
              </DialogHeader>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Content Type Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(TYPE_META).map(([key, meta], index) => (
                      <motion.div
                        key={`${key}-${index}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          type="button"
                          variant={type === key ? "default" : "outline"}
                          className={`w-full h-24 p-4 flex flex-col gap-2 transition-all duration-300 ${
                            type === key 
                              ? "bg-slate-800 text-white border-slate-800 shadow-lg dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200" 
                              : "hover:bg-slate-50 hover:border-slate-300 border-slate-200 dark:hover:bg-slate-700 dark:border-slate-600 dark:hover:border-slate-500"
                          }`}
                          onClick={() => setType(key as keyof typeof TYPE_META)}
                        >
                          <div className="text-2xl">{meta.icon}</div>
                          <span className="font-medium">{meta.label}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Content Details */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Title */}
                  

                  {/* Type-specific fields */}
                  {renderTypeSpecificFields()}
                </motion.div>
              )}

              {/* Step 3: Categorization */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Category Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Choose a Category
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {CATEGORIES.filter((c: any) => c._id !== "all").map((cat: any, index: number) => (
                        <motion.div
                          key={`${cat._id}-${index}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            type="button"
                            variant={category === cat._id ? "default" : "outline"}
                            className={`w-full h-16 p-3 flex flex-col items-center gap-1 transition-all duration-300 ${
                              category === cat._id 
                                ? "bg-slate-800 text-white border-slate-800 shadow-lg dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200" 
                                : "hover:bg-slate-50 border-slate-200 dark:hover:bg-slate-700 dark:border-slate-600"
                            }`}
                            onClick={() => setCategory(cat._id)}
                          >
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-xs font-medium">{cat.name}</span>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Add Tags (optional)
                    </Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="productivity, mindset, habits (separate with commas)"
                      className="h-12 border rounded-lg transition-colors text-base border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add relevant tags to help others discover your content
                    </p>
                  </div>

                  {/* Preview Card */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Preview</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-100 border-slate-300 dark:bg-slate-600 dark:border-slate-500 text-slate-700 dark:text-slate-300">
                          {TYPE_META[type]?.icon}
                          <span className="ml-1">{TYPE_META[type]?.label}</span>
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {CATEGORIES.find((c: any) => c._id === category)?.icon} {category}
                        </Badge>
                      </div>
                      <h5 className="font-medium text-slate-900 dark:text-slate-100">
                        {title || "Your title will appear here"}
                      </h5>
                      {tags && (
                        <div className="flex flex-wrap gap-1">
                          {tags.split(",").map((tag, i, index) => (
                            <Badge key={`${tag}-${i}-${index}`} variant="secondary" className="text-xs">
                              #{tag.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={step === 1 ? handleClose : handleBack}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {step === 1 ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-6"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black dark:from-slate-200 dark:to-slate-100 dark:hover:from-slate-100 dark:hover:to-white text-white dark:text-slate-900 px-8 shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced Auth Modal with Forgot Password
function AuthModal({
  open,
  mode = "login",
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode?: "login" | "signup" | "forgot" | string;
  onClose?: () => void;
  onSuccess?: (user: any) => void;
}) {
  const [active, setActive] = useState(mode);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActive(mode);
  }, [mode]);

  const handleSubmit = async (formData: { email: any; password: any; username: any; }) => {
    console.log("Form submitted:", formData);
    console.log(active);
    
    
    setIsLoading(true);
     try {
      let response;
      
      if (active === "login") {
        
        response = await ApiService.login({
          email: formData.email,
          password: formData.password
        });
      } else if (active === "signup") {
        var checkEmail =  await ApiService.checkEmail({
            email: formData.email,
        })
        console.log(checkEmail);
        if(checkEmail){
  response = await ApiService.signup({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
        }
      
      }
      console.log("Authentication response:", response);
        if(response && response.token){
            if (onSuccess) onSuccess(response);
            showSuccessToast(`Welcome ${active === "login" ? "back" : "to InspireLens"}, ${response.username}!`);
            setIsLoading(false);
            if (onClose) onClose();
        } else {
            showErrorToast(response.message || "Authentication failed. Please try again.");
            setIsLoading(false);
            return;
        }
      
    } catch (err: unknown) {
        console.error("Error during authentication:", err);
        const message = err instanceof Error ? err.message : typeof err === "string" ? err : "An error occurred. Please try again.";
        showErrorToast(message);
        setIsLoading(false);
        return;
    }

    
    // Simulate a brief delay for better UX
    await simulateDelay(800);
    
    const userData = {
      ...formData,
      id: Date.now()
    };
    
    if(onSuccess) onSuccess(userData);
    showSuccessToast(`Welcome ${active === "login" ? "back" : "to InspireLens"}, ${formData.username}!`);
    setIsLoading(false);
  };




const handleGoogleLogin = async (credentialResponse: { credential?: string }) => {
  setIsLoading(true);
  // setErrors(null);

  const token = credentialResponse?.credential;
  if (!token) {
setErrors(null);
    setIsLoading(false);
    return;
  }

  try {
    const response = await fetch("http://localhost:8080/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Google sign-in failed");
    }

    console.log("Google login success:", data);

    if (data?.token) {
      onSuccess?.(data);           // update app state
      showSuccessToast("Signed in with Google!");
      onClose?.();
    } else {
      throw new Error("Invalid response from server");
    }
  } catch (error: any) {
    console.error("Google login error:", error);
    setErrors(error.message || "Google sign-in failed");
  } finally {
    setIsLoading(false);
  }
};




  return (
    <Dialog open={open} onOpenChange={(v: any) => { if (!v && !isLoading) onClose?.(); }}>
      <DialogContent className="max-w-4xl sm:max-w-4xl p-0 overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-xl rounded-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>Login or signup for InspireLens</DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="grid md:grid-cols-2"
        >
          {/* Left panel - Visual */}
          <div className="hidden md:block bg-slate-800 dark:bg-slate-900 text-white p-6">
            <div className="h-full flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="mb-4">
                  <InspireLensLogo size="lg" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Welcome to InspireLens</h2>
                <p className="text-slate-300 dark:text-slate-400 mb-6">
                  Join a community of growth-minded individuals sharing wisdom, inspiration, and insights.
                </p>
                <div className="space-y-3">
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center">
                      <span className="text-sm">✨</span>
                    </div>
                    <span className="text-sm">Discover curated content from experts and thought leaders</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center">
                      <span className="text-sm">🚀</span>
                    </div>
                    <span className="text-sm">Share your insights and inspire others on their journey</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center">
                      <span className="text-sm">💡</span>
                    </div>
                    <span className="text-sm">Connect with like-minded individuals and grow together</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right panel - Forms */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {active === "login" ? "Welcome back" : active === "signup" ? "Create your account" : "Reset your password"}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
                {active === "login" 
                  ? "Sign in to continue your growth journey" 
                  : active === "signup"
                  ? "Start your journey of continuous learning and inspiration"
                  : "Enter your email to receive a password reset link"
                }
              </p>
            </div>

            {active !== "forgot" && (
              <div className="mb-4">
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <Button
                    type="button"
                    variant={active === "login" ? "default" : "ghost"}
                    className={`flex-1 rounded transition-all duration-200 ${
                      active === "login" 
                        ? "bg-white shadow-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200" 
                        : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setActive("login")}
                    disabled={isLoading}
                  >
                    Log in
                  </Button>
                  <Button
                    type="button"
                    variant={active === "signup" ? "default" : "ghost"}
                    className={`flex-1 rounded transition-all duration-200 ${
                      active === "signup" 
                        ? "bg-white shadow-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200" 
                        : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setActive("signup")}
                    disabled={isLoading}
                  >
                    Sign up
                  </Button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {active === "login" ? (
                  <LoginForm onSuccess={handleSubmit} onGoogleLogin={handleGoogleLogin} isLoading={isLoading} onForgotPassword={() => setActive("forgot")} />
                ) : active === "signup" ? (
                  <SignupForm onSuccess={handleSubmit} onGoogleLogin={handleGoogleLogin} isLoading={isLoading} />
                ) : (
                  <ForgotPasswordForm onBack={() => setActive("login")} isLoading={isLoading} />
                )}
              </motion.div>
            </AnimatePresence>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
              By continuing, you agree to our{" "}
              <button className="underline hover:text-slate-700 dark:hover:text-slate-300">Terms of Service</button>
              {" "}and{" "}
              <button className="underline hover:text-slate-700 dark:hover:text-slate-300">Privacy Policy</button>
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

  function LoginForm({
    onSuccess,
    isLoading,
    onGoogleLogin,
    onForgotPassword,
  }: {
    onSuccess: (formData: { username: string; email: string; password: string }) => void;
    isLoading?: boolean;
    onGoogleLogin?: (credentialResponse: any) => void;
    onForgotPassword?: () => void;
  }) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    }
    
    return newErrors;
  };

const handleSubmitLogin = (e: React.FormEvent<HTMLFormElement>) => {
  console.log("Submitting login form:", { email, password });
  e.preventDefault();

  // Validate form
  const formErrors = validateForm();
  console.log("Form errors:", formErrors);

  if (Object.keys(formErrors).length > 0) {
    setErrors(formErrors);
    return;
  }

  // Clear previous errors
  setErrors({});

  // Optional: hash password before sending
  // const salt = bcrypt.genSaltSync(10);
  // const hashedPassword = bcrypt.hashSync(password, salt);

  // Call success callback
  onSuccess({
    username: email.split("@")[0],
    email,
    password: password || "" // replace with hashedPassword if hashing
  });
};




const handleGoogleLogin = async (credentialResponse: any) => {
  console.log("Credential response:", credentialResponse);

  if (!credentialResponse?.credential) {
    console.warn("No credential returned from Google", credentialResponse);
    return;
  }

  if (onGoogleLogin) {
    console.log("Calling onGoogleLogin callback:", onGoogleLogin);
    try {
      onGoogleLogin(credentialResponse);
    } catch (error) {
      console.error("Error in onGoogleLogin:", error);
    }
  }
};



  return (
  <form onSubmit={handleSubmitLogin} className="space-y-4">
    {/* <GoogleOAuthProvider clientId={CLIENT_ID}> */}
   <div className="w-full">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setErrors({ google: "Google login failed" })}
            text="continue_with"
            shape="pill"
            width={400}
            containerProps={{ className: "flex items-center justify-center w-full h-12 rounded-xl border border-gray-300 bg-white shadow-sm cursor-pointer hover:shadow-md hover:bg-gray-50 active:shadow-sm transition-all duration-200 ease-in-out" }}
          />
          {errors?.google && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm mt-1 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {errors.google}
            </motion.p>
          )}
        </div>
    {/* </GoogleOAuthProvider> */}

    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200 dark:border-slate-600"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          or continue with email
        </span>
      </div>
    </div>

    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors(prev => ({ ...prev, email: null }));
          }}
          placeholder="you@example.com"
          className={`h-10 border rounded transition-colors ${
            errors.email
              ? "border-red-300 focus:border-red-500"
              : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
          }`}
          disabled={isLoading}
        />
        {errors.email && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.email}
          </motion.p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors(prev => ({ ...prev, password: null }));
            }}
            placeholder="Enter your password"
            className={`h-10 border rounded pr-10 transition-colors ${
              errors.password
                ? "border-red-300 focus:border-red-500"
                : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
            }`}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>
        {errors.password && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.password}
          </motion.p>
        )}
      </div>
    </div>

    <div className="flex items-center justify-between text-sm">
      <button
        type="button"
        onClick={onForgotPassword}
        className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      >
        Forgot password?
      </button>
    </div>

    <Button
      type="submit"
      className="w-full h-10 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded disabled:opacity-50 transition-all duration-200"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  </form>
);
  }

function SignupForm({
  onSuccess,
  isLoading,
  onGoogleLogin,
}: {
  onSuccess: (formData: { username: string; email: string; password: string }) => void;
  isLoading?: boolean;
  onGoogleLogin?: (credentialResponse: any) => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (!validateUsername(username)) {
      newErrors.username = "Username must be 3-20 characters, letters, numbers, and underscores only";
    }
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 8 characters with letters and numbers";
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
  //   const salt = bcrypt.genSaltSync(10);
  // const hashedPassword = bcrypt.hashSync(password, salt);
    
    setErrors({});
    onSuccess({ username, email, password: password });
  };

const handleGoogleSignup = async (credentialResponse: any) => {
  console.log("Credential response:", credentialResponse);

  if (!credentialResponse?.credential) {
    console.warn("No credential returned from Google", credentialResponse);
    return;
  }

  if (onGoogleLogin) {
    console.log("Calling onGoogleLogin callback:", onGoogleLogin);
    try {
      onGoogleLogin(credentialResponse);
    } catch (error) {
      console.error("Error in onGoogleLogin:", error);
    }
  }
};




  return (


      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Google Signup Button */}
        <div className="w-full">
          <GoogleLogin
            onSuccess={handleGoogleSignup}
            onError={() => setErrors({ google: "Google login failed" })}
            text="continue_with"
            shape="pill"
            width={400}
            containerProps={{ className: "flex items-center justify-center w-full h-12 rounded-xl border border-gray-300 bg-white shadow-sm cursor-pointer hover:shadow-md hover:bg-gray-50 active:shadow-sm transition-all duration-200 ease-in-out" }}
          />
          {errors?.google && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm mt-1 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {errors.google}
            </motion.p>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              or create your account
            </span>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errors?.username) setErrors((prev) => ({ ...prev, username: null }));
            }}
            placeholder="Enter your username"
            disabled={isLoading}
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors?.email) setErrors((prev) => ({ ...prev, email: null }));
            }}
            placeholder="you@example.com"
            disabled={isLoading}
          />
        </div>

        {/* Password */}
          <div className="space-y-1">
        <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors(prev => ({ ...prev, password: null }));
            }}
            placeholder="Enter your password"
            className={`h-10 border rounded pr-10 transition-colors ${
              errors.password
                ? "border-red-300 focus:border-red-500"
                : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
            }`}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>
      </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 text-sm">Confirm Password</Label>
          <div className="relative">
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors?.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
            }}
            placeholder="Confirm your password"
            disabled={isLoading}
          />
          </div>
        </div>

        {/* Submit */}
        <Button type="submit" disabled={isLoading} className="w-full h-10">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

  );
}

function ForgotPasswordForm({ onBack, isLoading }: { onBack: () => void; isLoading?: boolean }) {
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setErrors({});
    
    // Simulate delay
    await simulateDelay(1000);
    
    setSubmitted(true);
    showSuccessToast("Password reset link sent to your email!");
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Check your email</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
        <Button onClick={onBack} variant="outline" className="w-full">
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setEmail(e.target.value);
            if (errors.email) setErrors(prev => ({ ...prev, email: null }));
          }}
          placeholder="you@example.com"
          className={`h-10 border rounded transition-colors ${
            errors.email ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-slate-500 dark:border-slate-600 dark:focus:border-slate-400"
          }`}
          disabled={isLoading}
        />
        {errors.email && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 text-sm flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.email}
          </motion.p>
        )}
      </div>

      <div className="space-y-2">
        <Button
          type="submit"
          className="w-full h-10 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded disabled:opacity-50 transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
        
        <Button type="button" onClick={onBack} variant="ghost" className="w-full">
          Back to login
        </Button>
      </div>
    </form>
  );
}

// Floating Action Button
function FloatingActionButton({
  onClick,
  currentUser,
}: {
  onClick: () => void;
  currentUser?: { id?: number; username?: string; name?: string } | null;
}): React.ReactElement | null {
  if (!currentUser) return null;

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200, damping: 15 }}
    >
      <Button
        onClick={onClick}
        className="w-12 h-12 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
        size="icon"
        aria-label="Create new content"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </motion.div>
  );
}

// Main App
function AppContent() {
  interface Comment {
    id: number;
    text: string;
    user: string;
    created_at: number;
    createdBy: string;
  }

  interface Item {
    id: number;
    url: string;
    tags: string[];
    type: string;
    user: string;
    title: string;
    author: string;
    points: Vote[] | null;
    points_count: number;
    content: string;
    category: string;
    category_name: string;
    category_id: string;
    comments: Comment[] | null;
    created_at: number;
    userId: number;
  }

  const [items, setItems] = useState<Item[]>(initialItems || []);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("inspirelens_user") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setItems(items);
    const loadInitialContent = async () => {
      setIsLoading(true);
      await simulateDelay(500);
      setIsLoading(false);
    };
    loadInitialContent();
  }, []);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage]);

  const handleCategoryChange = async (categoryId: number | string) => {
    const newCategory = String(categoryId) === "1" ? "all" : String(categoryId);
    if (newCategory === activeCategory) return;

    setIsLoading(true);
    setActiveCategory(newCategory);
    setCurrentPage(1);

    await simulateDelay(300);

    try {
      const response = await ApiService.getContentByCategory(newCategory, 1, activeType);

      if (response.posts && response.posts.length > 0) {
        setItems(response.posts);
      }

      const matchedCategory = CATEGORIES.filter((c: any) => String(c.id) === newCategory)[0];
      showInfoToast(`Loaded ${matchedCategory?.name || "content"}`);
    } catch (error) {
      console.error("Failed to load category content:", error);
      showErrorToast("Failed to load content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = async (typeId: React.SetStateAction<string>) => {
    if (typeId === activeType) return;
    
    setIsLoading(true);
    if(typeId === "prompt") {
      typeId = "aiprompt"
    }
    setActiveType(typeId);
    setCurrentPage(1);
    
    try {
      const response = await ApiService.getContentByType(typeId, 1, activeCategory);
      
      if (response.items || response.posts) {
        setItems(response.items || response.posts);
      }
      
      const typeName = typeId === 'all' ? 'All Types' : TYPE_META[String(typeId) as keyof typeof TYPE_META]?.label || String(typeId);
      showInfoToast(`Filtered by ${typeName}`);
    } catch (error) {
      console.error("Failed to load type content:", error);
      showErrorToast("Failed to filter content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = async (page: React.SetStateAction<number>) => {
    if (page === currentPage) return;
    
    setIsLoading(true);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    await simulateDelay(400);
    
    showInfoToast(`Page ${page}`);
    setIsLoading(false);
  };

  function openAuth(mode = "login") {
    if (mode === "logout") {
      setCurrentUser(null);
      localStorage.removeItem("inspirelens_user");
      showSuccessToast("You have been logged out successfully");
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  }

  const isAuthHandledRef = useRef(false);

  function handleAuthSuccess(user: any) {
    if (isAuthHandledRef.current) return;
    isAuthHandledRef.current = true;

    setCurrentUser(user);
    if (user.token) {
      localStorage.setItem("inspirelens_user", JSON.stringify(user));
    }
    setAuthOpen(false);
  }

  function handleCreateContent(newItem: Item) {
    setItems((prev) => [newItem, ...prev]);
    setCurrentPage(1);
    
    if (activeCategory !== "all" && activeCategory !== newItem.category_id) {
      setActiveCategory(newItem.category_id || newItem.category);
    }
  }

  // ✅ OPTIMIZED handleVote - only updates the specific voted item
  const handleVote = useCallback((id: number, delta: number, updatedVotes?: Vote[], postType?: string) => {
    setItems((prev: Item[]) => {
      return prev.map((item) => {
        // Skip items that don't match
        if (item.id !== id || item.type !== postType) {
          return item;
        }

        // Update only the matching item
        const oldPoints = item.points_count;
        const newPoints = Math.max(0, oldPoints + delta);
        const updatedVotesArray = updatedVotes || item.points;

        // Return updated item with immutable update
        return {
          ...item,
          points_count: newPoints,
          points: updatedVotesArray,
        };
      });
    });
  }, []);

  // ✅ OPTIMIZED handleAddComment - only updates the specific commented item
  const handleAddComment = useCallback(async (itemId: number, postType: string, comment: { text: any; userId: any; user: string; createdBy: string; }) => {
    const optimisticComment = {
      ...comment,
      id: Date.now(),
    };
     
    // Add comment to UI immediately (optimistic update)
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        
        return {
          ...item,
          comments: [
            ...(item.comments ?? []),
            {
              id: optimisticComment.id,
              text: optimisticComment.text,
              user: optimisticComment.user,
              created_at: Date.now(),
              createdBy: optimisticComment.createdBy,
            } as Comment,
          ],
        };
      })
    );

    try {
      const response = await ApiService.addComment(itemId, postType, comment.text, comment.userId);
      
      // Replace optimistic comment with real one from server
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) {
            return item;
          }
          
          const updatedComments = Array.isArray(item.comments)
            ? item.comments.map(c => 
                c.id === optimisticComment.id ? response.comment : c
              )
            : [];
          
          return { ...item, comments: updatedComments };
        })
      );
    } catch (error) {
      console.error("Failed to add comment:", error);
      // Revert optimistic update on error
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) {
            return item;
          }
          
          return {
            ...item,
            comments: Array.isArray(item.comments)
              ? item.comments.filter(c => c.id !== optimisticComment.id)
              : [],
          };
        })
      );
      showErrorToast("Failed to add comment. Please try again.");
    }
  }, []);

  // ✅ OPTIMIZED handleDeleteComment - only updates the specific item
  const handleDeleteComment = useCallback((itemId: number, commentId: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        
        return {
          ...item,
          comments: Array.isArray(item.comments) 
            ? item.comments.filter(c => c.id !== commentId) 
            : [],
        };
      })
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Header 
          currentUser={currentUser} 
          onOpenAuth={openAuth}
          onOpenCreateModal={() => setCreateOpen(true)}
        />

        <AuthModal
          open={authOpen}
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />

        <CreateContentModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateContent}
          currentUser={currentUser}
          onRequireAuth={() => openAuth("login")}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <Sidebar
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                isLoading={isLoading}
              />
            </div>
          </aside>

          <main className="lg:col-span-3">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-sm">
                      {items.length} inspirational {items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <MobileCategorySidebar 
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    isLoading={isLoading}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Page {currentPage} of {totalPages || 1}</span>
                </div>
              </div>

              <ContentTypeFilter 
                activeType={activeType}
                onTypeChange={handleTypeChange}
              />

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`${activeCategory}-${activeType}-${currentPage}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {paginatedItems.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-3">🔍</div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                          No content found
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">
                          Try selecting a different category or content type.
                        </p>
                      </div>
                    ) : (
                      paginatedItems.map((item, index) => (
                        <ItemCard
                          key={`${item.id}-${index}`}
                          item={item}
                          index={index}
                          onVote={handleVote}
                          onAddComment={handleAddComment}
                          onDeleteComment={handleDeleteComment}
                          onRequireAuth={() => openAuth("login")}
                          currentUser={currentUser}
                        />
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!isLoading && items.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  isLoading={isLoading}
                />
              )}
            </div>
          </main>
        </div>

        <FloatingActionButton 
          onClick={() => setCreateOpen(true)}
          currentUser={currentUser}
        />

        <footer className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
            <span>© {new Date().getFullYear()} InspireLens</span>
            <span>•</span>
            <span>Built for growth-minded individuals</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Made with <Star className="w-3 h-3 text-yellow-500 fill-current" />
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <AppContent />
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

function showErrorToast(message: string) {
  toast.error(message, {
    duration: 4000,
    style: {
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
    },
  });
}

function setErrors(arg0: null) {
  throw new Error("Function not implemented.");
}

