/**
 * Ensures a modal root for React portal-based modals exists before tests.
 * Appends <div id="modal-root"></div> to document.body if not already present.
 * Allows modals using ReactDOM.createPortal to function in the testing environment.
 */
if (
  typeof document !== "undefined" &&
  !document.getElementById("modal-root")
) {
  const modalRoot = document.createElement("div");
  modalRoot.id = "modal-root";
  document.body.appendChild(modalRoot);
}

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
