import fs from "fs";
import path from "path";
import crypto from "crypto";

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");

interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  messageCount: number;
  isSubscribed: boolean;
  subscriptionType?: "monthly" | "yearly";
}

interface BusinessProfile {
  id: string;
  userId: string;
  name: string;
  businessType: string;
  tone: string;
  customDetails: string;
}

interface Conversation {
  id: string;
  userId: string;
  timestamp: string;
  businessType: string;
  goal: string;
  tone: string;
  message: string;
  replies: any[];
}

interface DatabaseSchema {
  users: User[];
  profiles: BusinessProfile[];
  conversations: Conversation[];
  sessions?: Record<string, string>; // token -> userId
}

class LocalDB {
  private data: DatabaseSchema = { users: [], profiles: [], conversations: [], sessions: {} };

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(raw);
        // Ensure arrays and record exist
        if (!this.data.users) this.data.users = [];
        if (!this.data.profiles) this.data.profiles = [];
        if (!this.data.conversations) this.data.conversations = [];
        if (!this.data.sessions) this.data.sessions = {};
      } catch (e) {
        console.error("Failed to parse db.json, starting fresh", e);
      }
    } else {
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write to db.json", e);
    }
  }

  private setSession(token: string, userId: string) {
    if (!this.data.sessions) this.data.sessions = {};
    this.data.sessions[token] = userId;
    this.save();
  }

  private getSession(token: string): string | undefined {
    if (!this.data.sessions) return undefined;
    return this.data.sessions[token];
  }

  private deleteSession(token: string) {
    if (this.data.sessions) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  // Password hashing helper
  private hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password + "replynest-salt-key-99").digest("hex");
  }

  // User Auth functions
  public register(email: string, name: string, password: string): { user?: Omit<User, "passwordHash">; token?: string; error?: string } {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.data.users.some(u => u.email === normalizedEmail)) {
      return { error: "An account with this email already exists." };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: this.hashPassword(password),
      messageCount: 0,
      isSubscribed: false
    };

    this.data.users.push(newUser);
    
    // Seed sample profiles for newly registered user to make experience premium
    const defaultProfile: BusinessProfile = {
      id: crypto.randomUUID(),
      userId: newUser.id,
      name: `${newUser.name}'s Shop`,
      businessType: "Clothing Store",
      tone: "Friendly",
      customDetails: "We sell premium organic cotton apparel with same-day London shipping."
    };
    this.data.profiles.push(defaultProfile);

    this.save();

    const token = crypto.randomBytes(32).toString("hex");
    this.setSession(token, newUser.id);

    const { passwordHash, ...userWithoutPassword } = newUser;
    return { user: userWithoutPassword, token };
  }

  public login(email: string, password: string): { user?: Omit<User, "passwordHash">; token?: string; error?: string } {
    const normalizedEmail = email.toLowerCase().trim();
    const user = this.data.users.find(u => u.email === normalizedEmail);
    if (!user) {
      return { error: "Invalid email or password." };
    }

    const hash = this.hashPassword(password);
    if (user.passwordHash !== hash) {
      return { error: "Invalid email or password." };
    }

    // Fallback fill for legacy users
    if (user.messageCount === undefined) user.messageCount = 0;
    if (user.isSubscribed === undefined) user.isSubscribed = false;

    const token = crypto.randomBytes(32).toString("hex");
    this.setSession(token, user.id);

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  public googleSignIn(uid: string, email: string, name: string): { user: Omit<User, "passwordHash">; token: string } {
    const normalizedEmail = email.toLowerCase().trim();
    let user = this.data.users.find(u => u.id === uid || u.email === normalizedEmail);

    if (!user) {
      user = {
        id: uid,
        email: normalizedEmail,
        name: name.trim() || "Google User",
        passwordHash: "",
        messageCount: 0,
        isSubscribed: false
      };
      this.data.users.push(user);

      const defaultProfile: BusinessProfile = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: `${user.name}'s Shop`,
        businessType: "Clothing Store",
        tone: "Friendly",
        customDetails: "We sell premium organic cotton apparel with same-day London shipping."
      };
      this.data.profiles.push(defaultProfile);
      this.save();
    } else {
      if (user.id !== uid) {
        user.id = uid;
        this.save();
      }
    }

    // Fallback fill for legacy users
    if (user.messageCount === undefined) user.messageCount = 0;
    if (user.isSubscribed === undefined) user.isSubscribed = false;

    const token = uid;
    this.setSession(token, user.id);

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  public getUserByToken(token: string): Omit<User, "passwordHash"> | null {
    const userId = this.getSession(token);
    if (!userId) return null;
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    
    // Fallback fill for legacy users
    if (user.messageCount === undefined) user.messageCount = 0;
    if (user.isSubscribed === undefined) user.isSubscribed = false;

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  public incrementMessageCount(userId: string): number {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      if (user.messageCount === undefined) user.messageCount = 0;
      user.messageCount += 1;
      this.save();
      return user.messageCount;
    }
    return 0;
  }

  public subscribeUser(userId: string, subscriptionType: "monthly" | "yearly"): Omit<User, "passwordHash"> | null {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.isSubscribed = true;
      user.subscriptionType = subscriptionType;
      this.save();
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  public logout(token: string) {
    this.deleteSession(token);
  }

  // Business Profile Management
  public getProfiles(userId: string): BusinessProfile[] {
    return this.data.profiles.filter(p => p.userId === userId);
  }

  public createProfile(userId: string, name: string, businessType: string, tone: string, customDetails: string): BusinessProfile {
    const newProfile: BusinessProfile = {
      id: crypto.randomUUID(),
      userId,
      name: name.trim(),
      businessType,
      tone,
      customDetails: customDetails.trim()
    };
    this.data.profiles.push(newProfile);
    this.save();
    return newProfile;
  }

  public updateProfile(userId: string, profileId: string, name: string, businessType: string, tone: string, customDetails: string): BusinessProfile | null {
    const index = this.data.profiles.findIndex(p => p.id === profileId && p.userId === userId);
    if (index === -1) return null;

    this.data.profiles[index] = {
      ...this.data.profiles[index],
      name: name.trim(),
      businessType,
      tone,
      customDetails: customDetails.trim()
    };
    this.save();
    return this.data.profiles[index];
  }

  public deleteProfile(userId: string, profileId: string): boolean {
    const initialLen = this.data.profiles.length;
    this.data.profiles = this.data.profiles.filter(p => !(p.id === profileId && p.userId === userId));
    const deleted = this.data.profiles.length < initialLen;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // Conversation History Management
  public getConversations(userId: string): Conversation[] {
    return this.data.conversations
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public saveConversation(
    userId: string, 
    businessType: string, 
    goal: string, 
    tone: string, 
    message: string, 
    replies: any[]
  ): Conversation {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      userId,
      timestamp: new Date().toISOString(),
      businessType,
      goal,
      tone,
      message: message.trim(),
      replies
    };
    this.data.conversations.push(newConversation);
    this.save();
    return newConversation;
  }

  public deleteConversation(userId: string, conversationId: string): boolean {
    const initialLen = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter(c => !(c.id === conversationId && c.userId === userId));
    const deleted = this.data.conversations.length < initialLen;
    if (deleted) {
      this.save();
    }
    return deleted;
  }
}

export const db = new LocalDB();
