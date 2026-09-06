import React from 'react';
import Button from './Button';
import './ErrorBoundary.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-card">
            <div className="error-icon">!</div>
            <h3 className="error-title">{this.props.fallbackTitle || "Something went wrong"}</h3>
            <p className="error-message">
              {this.state.error?.message || "An unexpected error occurred while displaying this section."}
            </p>
            <div className="error-actions">
              <Button variant="primary" size="md" onClick={this.handleReset}>
                Try again
              </Button>
              <Button 
                variant="ghost" 
                size="md" 
                onClick={() => window.location.reload()}
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
