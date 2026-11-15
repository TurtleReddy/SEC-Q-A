import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

function App() {
  const [newQuestion, setNewQuestion] = useState("");
  const [questionDetails, setQuestionDetails] = useState("");
  const [currentPage, setCurrentPage] = useState("forum");
  const [adminTab, setAdminTab] = useState("pending");
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [category, setCategory] = useState("Clubs & Organizations");
  const [studentName, setStudentName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [editedResponseText, setEditedResponseText] = useState("");
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [forumPage, setForumPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navbarRef = useRef(null);
  const [expandedResponses, setExpandedResponses] = useState(new Set());
  useEffect(() => {
    loadQuestions();
  }, []);
  useEffect(() => {
  if (!mobileMenuOpen) return;

  function handleOutsideClick(event) {
    if (
      navbarRef.current &&
      !navbarRef.current.contains(event.target)
    ) {
      setMobileMenuOpen(false);
    }
  }

  document.addEventListener("pointerdown", handleOutsideClick);

  return () => {
    document.removeEventListener("pointerdown", handleOutsideClick);
  };
}, [mobileMenuOpen]);

  async function loadQuestions() {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setQuestions(data);
  }

  async function handleSubmit() {
    if (newQuestion.trim() === "") {
      alert("Please type a question first.");
      return;
    }

    const questionToAdd = {
      category: category,
      status: "pending",
      question: newQuestion,
      details: questionDetails,
      student_name: isAnonymous ? "Anonymous Student" : studentName,
      is_anonymous: isAnonymous,
      answer: "",
      draft_response: "",
    };

    const { data, error } = await supabase
      .from("questions")
      .insert([questionToAdd])
      .select();

    if (error) {
      console.error(error);
      alert("Something went wrong. Check the console.");
      return;
    }

    setQuestions([data[0], ...questions]);

    setNewQuestion("");
    setQuestionDetails("");
    setCategory("Clubs & Organizations");
    setStudentName("");
    setIsAnonymous(false);
    setCurrentPage("forum");
  }

  async function approveQuestion(id) {
    const questionToApprove = questions.find((item) => item.id === id);

    const finalAnswer =
      questionToApprove.draft_response ||
      questionToApprove.draftResponse ||
      "Approved. Official response coming soon.";

    const { error } = await supabase
      .from("questions")
      .update({
        status: "approved",
        answer: finalAnswer,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not approve question.");
      return;
    }

    const updatedQuestions = questions.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: "approved",
          answer: finalAnswer,
        };
      }

      return item;
    });

    setQuestions(updatedQuestions);
  }

  async function updateDraftResponse(id, text) {
    const updatedQuestions = questions.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          draft_response: text,
        };
      }

      return item;
    });

    setQuestions(updatedQuestions);

    const { error } = await supabase
      .from("questions")
      .update({
        draft_response: text,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
    }
  }

  async function updateResponse(id) {
    const { error } = await supabase
      .from("questions")
      .update({
        answer: editedResponseText,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not update response.");
      return;
    }

    const updatedQuestions = questions.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          answer: editedResponseText,
        };
      }

      return item;
    });

    setQuestions(updatedQuestions);
    setEditingResponseId(null);
    setEditedResponseText("");
  }

  async function rejectQuestion(id) {
    const { error } = await supabase
      .from("questions")
      .update({
        status: "rejected",
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not reject question.");
      return;
    }

    const updatedQuestions = questions.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: "rejected",
        };
      }

      return item;
    });

    setQuestions(updatedQuestions);
  }

  function checkAdminCode() {
    if (adminCodeInput === import.meta.env.VITE_ADMIN_CODE) {
      //Correct admin code entered, unlock admin review page//
      setIsAdminUnlocked(true);
      setAdminCodeInput("");
    } else {
      alert("Incorrect admin code.");
    }
  }

  function navigateToPage(page) {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  }

  function toggleResponse(itemId) {
    setExpandedResponses((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function renderOfficialResponse(item) {
    const response = (item.answer || "").trim();
    const maxLength = 180;
    const isLong = response.length > maxLength;
    const isExpanded = expandedResponses.has(item.id);

    if (!response) {
      return <p className="response-pending-text">An official response is not available yet.</p>;
    }

    return (
      <>
        <p>
          {isLong && !isExpanded
            ? `${response.slice(0, maxLength).trimEnd()}…`
            : response}
        </p>
        {isLong && (
          <button
            className="read-more-button"
            type="button"
            onClick={() => toggleResponse(item.id)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? "Read less" : "Read more"}
          </button>
        )}
      </>
    );
  }

  const filteredQuestions = questions.filter((item) => {
    const matchesSearch = item.question
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchesCategory =
      filterCategory === "All Categories" || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const visibleQuestions = filteredQuestions.filter(
    (item) => item.status === "approved"
  );

  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.ceil(
    visibleQuestions.length / QUESTIONS_PER_PAGE
  );

  const startIndex = (forumPage - 1) * QUESTIONS_PER_PAGE;

  const paginatedQuestions = visibleQuestions.slice(
    startIndex,
    startIndex + QUESTIONS_PER_PAGE
  );

  const pendingQuestions = questions.filter(
    (item) => item.status === "pending"
  );

  const approvedQuestions = questions.filter(
    (item) => item.status === "approved"
  );

  const rejectedQuestions = questions.filter(
    (item) => item.status === "rejected"
  );

  return (
    <main className="page">
      <nav
  className="navbar"
  aria-label="Main navigation"
  ref={navbarRef}
>
        <button
          className="logo"
          type="button"
          onClick={() => navigateToPage("forum")}
          aria-label="Go to Gunn SEC Q&A home page"
        >
          :) Gunn SEC Q&A
        </button>

        <button
          className="menu-toggle"
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`nav-links${mobileMenuOpen ? " nav-links-open" : ""}`}
          id="primary-navigation"
        >
          <button onClick={() => navigateToPage("forum")}>Q&A Forum</button>
          <button onClick={() => navigateToPage("ask")}>Ask a Question</button>
          <button onClick={() => navigateToPage("admin")}>Admin Review</button>
        </div>
      </nav>

      {currentPage === "forum" && (
        <>
          <section className="hero">
            {/* this is where you can add an eyebrow by doing this: 
            <p className="eyebrow">Student Government</p> */}
            <h1>Gunn SEC Q&A</h1>
            <p className="subtitle">
              Have any questions or suggestions you'd like to share with
              Gunn Student Executive Council (SEC)?
              Enter it down below, and a SEC member will answer your inquiry!
            </p>

            <button
              className="primary-button"
              onClick={() => setCurrentPage("ask")}
            >
              Ask a Question
            </button>
          </section>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search questions..."
              className="search-input"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <select
              className="search-input"
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
            >
              <option>All Categories</option>
              <option>Clubs & Organizations</option>
              <option>Events</option>
              <option>Student Life</option>
              <option>Facilities</option>
              <option>Academics</option>
              <option>Just for Fun</option>
              <option>Other</option>
            </select>
          </div>

          <section className="questions-section">
            <h2>All Questions</h2>

            {visibleQuestions.length === 0 && (
              <p className="empty-message">No approved questions found yet.</p>
            )}

            {paginatedQuestions.map((item) => (
              <article className="question-card" key={item.id}>
                <p
                  className={
                    item.answer &&
                      item.answer.trim() !==
                      "SEC has approved this question. An official response will be posted soon."
                      ? "status answered"
                      : "status pending"
                  }
                >
                  {item.answer &&
                    item.answer.trim() !==
                    "SEC has approved this question. An official response will be posted soon."
                    ? "Answered"
                    : "Response Pending"}
                </p>
                <p
                  className={`category-tag ${item.category
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/&/g, "")}`}
                >
                  {item.category}
                </p>
                <p className="student-name">{item.student_name || "Anonymous Student"}</p>

                <h3>{item.question}</h3>
                {item.details && <p>{item.details}</p>}

                <div className="admin-response-box">
                  <label>Official Response</label>
                  {renderOfficialResponse(item)}
                </div>
              </article>
            ))}
            {visibleQuestions.length > 0 && (
              <div className="pagination">
                <button
                  className="pagination-arrow"
                  onClick={() => setForumPage(forumPage - 1)}
                  disabled={forumPage === 1}
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;

                  return (
                    <button
                      key={pageNumber}
                      className={
                        forumPage === pageNumber
                          ? "pagination-number active"
                          : "pagination-number"
                      }
                      onClick={() => setForumPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  className="pagination-arrow"
                  onClick={() => setForumPage(forumPage + 1)}
                  disabled={forumPage === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {currentPage === "ask" && (
        <section className="form-page">

          <div className="form-card">
            <h1>Ask a Question</h1>
            <p>
              Submit your question to student government. It will be reviewed
              before being published.
            </p>

            <label>Category</label>
            <select
              className="question-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Clubs & Organizations</option>
              <option>Events</option>
              <option>Student Life</option>
              <option>Facilities</option>
              <option>Academics</option>
              <option>Just for Fun</option>
              <option>Other</option>
            </select>

            <label>Your Name</label>
            <input
              type="text"
              placeholder="Optional"
              className="question-input"
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              disabled={isAnonymous}
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
              />
              Submit anonymously
            </label>

            <label>Question Title</label>
            <input
              type="text"
              placeholder="Brief summary of your question"
              className="question-input"
              value={newQuestion}
              onChange={(event) => setNewQuestion(event.target.value)}
            />

            <label>Question Details</label>
            <textarea
              placeholder="Describe your question in detail..."
              className="question-input question-textarea"
              value={questionDetails}
              onChange={(event) => setQuestionDetails(event.target.value)}
            />

            <button className="primary-button" onClick={handleSubmit}>
              Submit Question
            </button>
          </div>
        </section>
      )}

      {currentPage === "admin" && !isAdminUnlocked && (
        <section className="form-page">
          <div className="form-card">
            <h1>Admin Access</h1>
            <p>Enter the admin code to review and respond to questions.</p>

            <input
              type="password"
              placeholder="Admin code"
              className="question-input"
              value={adminCodeInput}
              onChange={(event) => setAdminCodeInput(event.target.value)}
            />

            <button className="primary-button" onClick={checkAdminCode}>
              Enter Admin Review
            </button>
          </div>
        </section>
      )}

      {currentPage === "admin" && isAdminUnlocked && (
        <section className="questions-section">

          <h1>Admin Review</h1>
          <p className="admin-description">
            Review pending student questions before they appear publicly.
          </p>

          <div className="admin-tabs">
            <button onClick={() => setAdminTab("pending")}>
              Pending ({pendingQuestions.length})
            </button>

            <button onClick={() => setAdminTab("approved")}>
              Approved ({approvedQuestions.length})
            </button>

            <button onClick={() => setAdminTab("rejected")}>
              Rejected ({rejectedQuestions.length})
            </button>
          </div>

          {adminTab === "pending" && (
            <>
              {pendingQuestions.length === 0 && (
                <p className="empty-message">
                  No pending questions right now.
                </p>
              )}

              {pendingQuestions.map((item) => (
                <article className="admin-card" key={item.id}>
                  <div className="admin-card-header">
                    <div>
                      <p className="status pending">Pending Review</p>
                      <h3>{item.question}</h3>
                    </div>

                    <p
                      className={`category-tag ${item.category
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/&/g, "")}`}
                    >
                      {item.category}
                    </p>
                  </div>

                  <div className="admin-meta">
                    <span>Submitted by: {item.student_name || "Anonymous Student"}</span>
                  </div>

                  {item.details && (
                    <div className="admin-details">
                      <strong>Question Details</strong>
                      <p>{item.details}</p>
                    </div>
                  )}

                  <div className="admin-response-box">
                    <label>Official Response</label>
                    <textarea
                      className="question-input question-textarea"
                      placeholder="Type official response..."
                      value={item.draft_response || ""}
                      onChange={(event) =>
                        updateDraftResponse(item.id, event.target.value)
                      }
                    />
                  </div>

                  <div className="admin-actions">
                    <button
                      className="primary-button"
                      onClick={() => approveQuestion(item.id)}
                    >
                      Approve & Publish
                    </button>

                    <button
                      className="reject-button"
                      onClick={() => rejectQuestion(item.id)}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </>
          )}

          {adminTab === "approved" && (
            <>
              {approvedQuestions.length === 0 && (
                <p className="empty-message">No approved questions yet.</p>
              )}

              {approvedQuestions.map((item) => (
                <article className="question-card" key={item.id}>
                  <p className="status approved">Approved</p>
                  <p
                    className={`category-tag ${item.category
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/&/g, "")}`}
                  >
                    {item.category}
                  </p>

                  <h3>{item.question}</h3>
                  {item.details && <p>{item.details}</p>}

                  <div className="admin-response-box">
                    <label>Official Response</label>

                    {editingResponseId === item.id ? (
                      <>
                        <textarea
                          className="question-input question-textarea"
                          value={editedResponseText}
                          onChange={(event) => setEditedResponseText(event.target.value)}
                        />

                        <button
                          className="primary-button"
                          onClick={() => updateResponse(item.id)}
                        >
                          Update Response
                        </button>

                        <button
                          className="reject-button"
                          onClick={() => {
                            setEditingResponseId(null);
                            setEditedResponseText("");
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <p>{item.answer}</p>

                        <button
                          className="primary-button"
                          onClick={() => {
                            setEditingResponseId(item.id);
                            setEditedResponseText(item.answer || "");
                          }}
                        >
                          Edit Response
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </>
          )}

          {adminTab === "rejected" && (
            <>
              {rejectedQuestions.length === 0 && (
                <p className="empty-message">No rejected questions yet.</p>
              )}

              {rejectedQuestions.map((item) => (
                <article className="question-card" key={item.id}>
                  <p className="status rejected">Rejected</p>
                  <p
                    className={`category-tag ${item.category
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/&/g, "")}`}
                  >
                    {item.category}
                  </p>

                  <h3>{item.question}</h3>
                  {item.details && <p>{item.details}</p>}
                </article>
              ))}
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default App;