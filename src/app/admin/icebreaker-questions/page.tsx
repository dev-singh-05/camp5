"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import {
  getAllIcebreakerQuestions,
  createIcebreakerQuestion,
  updateIcebreakerQuestion,
  deleteIcebreakerQuestion,
  toggleIcebreakerQuestionStatus,
  type IcebreakerQuestion,
} from "@/utils/icebreaker";

export default function IcebreakerAdminPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<IcebreakerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newUsageType, setNewUsageType] = useState<"match_dating" | "ice_breaker_chat" | "both">("both");
  const [editingQuestion, setEditingQuestion] = useState<IcebreakerQuestion | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editUsageType, setEditUsageType] = useState<"match_dating" | "ice_breaker_chat" | "both">("both");
  
  // UI state
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        // Check authentication
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          alert("Please log in to access the admin panel.");
          router.push("/login");
          return;
        }
        setUser(auth.user);

        // Load questions
        await loadQuestions();
      } catch (err) {
        console.error("Init error:", err);
        alert("Failed to load admin panel.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function loadQuestions() {
    try {
      const data = await getAllIcebreakerQuestions();
      setQuestions(data);
    } catch (err) {
      console.error("Error loading questions:", err);
      alert("Failed to load questions.");
    }
  }

  async function handleAddQuestion() {
    if (!newQuestion.trim()) {
      alert("Please enter a question.");
      return;
    }

    try {
      setProcessingId("adding");
      await createIcebreakerQuestion(newQuestion.trim(), true, newUsageType);
      await loadQuestions();
      setNewQuestion("");
      setNewUsageType("both");
      setShowAddModal(false);
      alert("Question added successfully!");
    } catch (err) {
      console.error("Error adding question:", err);
      alert("Failed to add question. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleEditQuestion() {
    if (!editingQuestion || !editQuestionText.trim()) {
      alert("Please enter a question.");
      return;
    }

    try {
      setProcessingId(editingQuestion.id);
      await updateIcebreakerQuestion(editingQuestion.id, {
        question: editQuestionText.trim(),
        usage_type: editUsageType,
      });
      await loadQuestions();
      setShowEditModal(false);
      setEditingQuestion(null);
      setEditQuestionText("");
      setEditUsageType("both");
      alert("Question updated successfully!");
    } catch (err) {
      console.error("Error updating question:", err);
      alert("Failed to update question. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleToggleStatus(question: IcebreakerQuestion) {
    if (!confirm(`Are you sure you want to ${question.is_active ? "deactivate" : "activate"} this question?`)) {
      return;
    }

    try {
      setProcessingId(question.id);
      await toggleIcebreakerQuestionStatus(question.id, !question.is_active);
      await loadQuestions();
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Failed to update question status. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteQuestion(question: IcebreakerQuestion) {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
      return;
    }

    try {
      setProcessingId(question.id);
      await deleteIcebreakerQuestion(question.id);
      await loadQuestions();
      alert("Question deleted successfully!");
    } catch (err) {
      console.error("Error deleting question:", err);
      alert("Failed to delete question. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  function openEditModal(question: IcebreakerQuestion) {
    setEditingQuestion(question);
    setEditQuestionText(question.question);
    setEditUsageType(question.usage_type || "both");
    setShowEditModal(true);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const activeQuestions = questions.filter((q) => q.is_active);
  const inactiveQuestions = questions.filter((q) => !q.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                aria-label="Go back"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Icebreaker Questions</h1>
                <p className="text-sm text-gray-600">Manage questions for new matches</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Questions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{questions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Questions</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{activeQuestions.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Questions</p>
                <p className="text-3xl font-bold text-gray-400 mt-1">{inactiveQuestions.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Active Questions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Active Questions ({activeQuestions.length})
          </h2>
          {activeQuestions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-500">No active questions. Add one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-pink-600">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-base leading-relaxed">{question.question}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>Created: {new Date(question.created_at || "").toLocaleDateString()}</span>
                        {question.updated_at && question.updated_at !== question.created_at && (
                          <span>• Updated: {new Date(question.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          question.usage_type === "match_dating"
                            ? "bg-purple-100 text-purple-700"
                            : question.usage_type === "ice_breaker_chat"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {question.usage_type === "match_dating" && "💞 Match Dating"}
                          {question.usage_type === "ice_breaker_chat" && "💬 Chat Only"}
                          {question.usage_type === "both" && "🌟 Both"}
                          {!question.usage_type && "🌟 Both"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(question)}
                        disabled={processingId === question.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(question)}
                        disabled={processingId === question.id}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                        title="Deactivate question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question)}
                        disabled={processingId === question.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inactive Questions */}
        {inactiveQuestions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              Inactive Questions ({inactiveQuestions.length})
            </h2>
            <div className="space-y-3">
              {inactiveQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white rounded-xl shadow-sm p-5 opacity-60 hover:opacity-100 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-600 text-base leading-relaxed line-through">{question.question}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>Created: {new Date(question.created_at || "").toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          question.usage_type === "match_dating"
                            ? "bg-purple-100 text-purple-700"
                            : question.usage_type === "ice_breaker_chat"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {question.usage_type === "match_dating" && "💞 Match Dating"}
                          {question.usage_type === "ice_breaker_chat" && "💬 Chat Only"}
                          {question.usage_type === "both" && "🌟 Both"}
                          {!question.usage_type && "🌟 Both"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(question)}
                        disabled={processingId === question.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(question)}
                        disabled={processingId === question.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Activate question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question)}
                        disabled={processingId === question.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Question</h2>
            <p className="text-gray-600 mb-6">Create an engaging icebreaker question for new matches.</p>
            
            <div className="mb-6">
              <label htmlFor="new-question" className="block text-sm font-medium text-gray-700 mb-2">
                Question
              </label>
              <textarea
                id="new-question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g., If you could have dinner with anyone, dead or alive, who would it be?"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Make it open-ended and engaging to help users start meaningful conversations.
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="new-usage-type" className="block text-sm font-medium text-gray-700 mb-2">
                Usage Type
              </label>
              <select
                id="new-usage-type"
                value={newUsageType}
                onChange={(e) => setNewUsageType(e.target.value as "match_dating" | "ice_breaker_chat" | "both")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="both">🌟 Both (Match Dating & Chat)</option>
                <option value="match_dating">💞 Match Dating Only</option>
                <option value="ice_breaker_chat">💬 Ice Breaker Chat Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Choose where this question should appear: when creating new matches, in chat conversations, or both.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestion("");
                  setNewUsageType("both");
                }}
                disabled={processingId === "adding"}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.trim() || processingId === "adding"}
                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === "adding" ? "Adding..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditModal && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Question</h2>
            <p className="text-gray-600 mb-6">Update the icebreaker question below.</p>
            
            <div className="mb-6">
              <label htmlFor="edit-question" className="block text-sm font-medium text-gray-700 mb-2">
                Question
              </label>
              <textarea
                id="edit-question"
                value={editQuestionText}
                onChange={(e) => setEditQuestionText(e.target.value)}
                placeholder="Enter your question here"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="edit-usage-type" className="block text-sm font-medium text-gray-700 mb-2">
                Usage Type
              </label>
              <select
                id="edit-usage-type"
                value={editUsageType}
                onChange={(e) => setEditUsageType(e.target.value as "match_dating" | "ice_breaker_chat" | "both")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="both">🌟 Both (Match Dating & Chat)</option>
                <option value="match_dating">💞 Match Dating Only</option>
                <option value="ice_breaker_chat">💬 Ice Breaker Chat Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Choose where this question should appear: when creating new matches, in chat conversations, or both.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingQuestion(null);
                  setEditQuestionText("");
                  setEditUsageType("both");
                }}
                disabled={processingId === editingQuestion.id}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditQuestion}
                disabled={!editQuestionText.trim() || processingId === editingQuestion.id}
                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === editingQuestion.id ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}