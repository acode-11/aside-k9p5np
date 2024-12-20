import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'; // v18.2.0
import Editor, { useMonaco } from '@monaco-editor/react'; // v4.6.0
import { debounce, throttle } from 'lodash'; // v4.17.21

import {
  EditorContainer,
  EditorToolbar,
  EditorContent,
  CodePanel,
  PreviewPanel,
  ResizeHandle
} from './DetectionEditor.styles';

import {
  Detection,
  ValidationResult,
  PerformanceImpact,
  DetectionSeverity
} from '../../../types/detection.types';

import { PlatformType } from '../../../types/platform.types';
import useDetection from '../../../hooks/useDetection';

// Constants for editor configuration
const VALIDATION_DEBOUNCE_MS = 1000;
const AUTOSAVE_INTERVAL_MS = 30000;
const PERFORMANCE_THRESHOLD_MS = 100;

interface DetectionEditorProps {
  detection: Detection;
  platformType: PlatformType;
  onSave?: (detection: Detection) => void;
  onValidate?: (result: ValidationResult) => void;
  onError?: (error: Error) => void;
  readOnly?: boolean;
}

interface EditorMetrics {
  lastChangeTime: number;
  validationTime: number;
  performanceScore: number;
}

/**
 * Enhanced Detection Editor component with real-time validation and platform preview
 */
export const DetectionEditor: React.FC<DetectionEditorProps> = ({
  detection,
  platformType,
  onSave,
  onValidate,
  onError,
  readOnly = false
}) => {
  // Monaco editor instance
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  // Local state
  const [content, setContent] = useState(detection.content);
  const [validationStatus, setValidationStatus] = useState<ValidationResult | null>(null);
  const [metrics, setMetrics] = useState<EditorMetrics>({
    lastChangeTime: Date.now(),
    validationTime: 0,
    performanceScore: 100
  });
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Custom hooks
  const { validateDetection, updateDetection } = useDetection();

  // Editor options with enhanced features
  const editorOptions = useMemo(() => ({
    minimap: { enabled: true },
    lineNumbers: 'on',
    folding: true,
    automaticLayout: true,
    theme: 'vs-dark',
    readOnly,
    accessibilitySupport: 'on',
    autoClosingBrackets: 'always',
    formatOnPaste: true,
    formatOnType: true,
    tabSize: 2,
    scrollBeyondLastLine: false
  }), [readOnly]);

  /**
   * Debounced validation handler with performance monitoring
   */
  const debouncedValidate = useCallback(
    debounce(async (content: string) => {
      try {
        const startTime = performance.now();
        const result = await validateDetection(detection.id, platformType, {
          performanceCheck: true,
          mitreMappingValidation: true
        });

        const validationTime = performance.now() - startTime;
        setMetrics(prev => ({
          ...prev,
          validationTime,
          performanceScore: Math.max(0, 100 - (validationTime / PERFORMANCE_THRESHOLD_MS) * 100)
        }));

        setValidationStatus(result);
        onValidate?.(result);
      } catch (error) {
        onError?.(error as Error);
      }
    }, VALIDATION_DEBOUNCE_MS),
    [detection.id, platformType, validateDetection, onValidate, onError]
  );

  /**
   * Throttled autosave handler
   */
  const throttledAutosave = useCallback(
    throttle(async (content: string) => {
      try {
        const updated = await updateDetection(detection.id, { content });
        onSave?.(updated);
      } catch (error) {
        onError?.(error as Error);
      }
    }, AUTOSAVE_INTERVAL_MS),
    [detection.id, updateDetection, onSave, onError]
  );

  /**
   * Handle editor content changes with performance tracking
   */
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value) return;

    const changeTime = performance.now();
    setContent(value);
    setMetrics(prev => ({
      ...prev,
      lastChangeTime: changeTime
    }));

    debouncedValidate(value);
    throttledAutosave(value);
  }, [debouncedValidate, throttledAutosave]);

  /**
   * Handle split pane resizing
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.querySelector('.editor-content');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const position = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setSplitPosition(Math.min(Math.max(position, 20), 80));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Setup editor and event listeners
  useEffect(() => {
    if (monaco) {
      // Register custom language support if needed
      monaco.languages.register({ id: 'detection' });
      
      // Setup keyboard shortcuts
      editorRef.current?.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => throttledAutosave(content)
      );
    }

    // Setup resize handlers
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      debouncedValidate.cancel();
      throttledAutosave.cancel();
    };
  }, [monaco, content, handleMouseMove, handleMouseUp, debouncedValidate, throttledAutosave]);

  return (
    <EditorContainer>
      <EditorToolbar>
        <div>
          <h3>Detection Editor</h3>
          <span>Platform: {platformType}</span>
        </div>
        <div>
          {validationStatus && (
            <span className={`validation-status ${validationStatus.issues.length === 0 ? 'valid' : 'invalid'}`}>
              {validationStatus.issues.length === 0 ? 'Valid' : `${validationStatus.issues.length} Issues`}
            </span>
          )}
          <span className="performance-score">
            Performance: {Math.round(metrics.performanceScore)}%
          </span>
        </div>
      </EditorToolbar>

      <EditorContent className="editor-content">
        <CodePanel style={{ width: `${splitPosition}%` }}>
          <Editor
            height="100%"
            defaultLanguage="detection"
            value={content}
            options={editorOptions}
            onChange={handleEditorChange}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </CodePanel>

        <ResizeHandle
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor panels"
        />

        <PreviewPanel style={{ width: `${100 - splitPosition}%` }}>
          <div className="preview-header">
            <h4>Preview</h4>
            <select defaultValue={platformType}>
              {Object.values(PlatformType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {validationStatus && (
            <div className="validation-results">
              <h5>Validation Results</h5>
              {validationStatus.issues.map((issue, index) => (
                <div key={index} className={`issue ${issue.severity.toLowerCase()}`}>
                  <span className="severity">{issue.severity}</span>
                  <span className="message">{issue.message}</span>
                  {issue.location && (
                    <span className="location">
                      Line {issue.location.line}, Column {issue.location.column}
                    </span>
                  )}
                </div>
              ))}
              
              <div className="metrics">
                <div>Performance Impact: {validationStatus.performanceImpact}</div>
                <div>False Positive Rate: {validationStatus.falsePositiveRate}%</div>
                <div>Resource Usage: {validationStatus.resourceUsage.resourceScore}%</div>
              </div>
            </div>
          )}
        </PreviewPanel>
      </EditorContent>
    </EditorContainer>
  );
};

export default DetectionEditor;