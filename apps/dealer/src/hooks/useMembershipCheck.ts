import { useState, useCallback } from 'react';

interface MembershipError {
  error: string;
  reason: string;
  limit?: number;
  current?: number;
  remaining?: number;
  upgradeRequired?: boolean;
}

interface UseMembershipCheckResult {
  showUpgradeModal: boolean;
  upgradeModalData: {
    reason: string;
    featureName?: string;
    currentLimit?: number;
  } | null;
  handleMembershipError: (error: MembershipError) => void;
  closeUpgradeModal: () => void;
  checkAndExecute: <T>(
    apiCall: () => Promise<Response>,
    featureName?: string
  ) => Promise<T | null>;
}

/**
 * Hook para manejar automáticamente errores de membresía
 * y mostrar el modal de upgrade cuando sea necesario
 */
export function useMembershipCheck(): UseMembershipCheckResult {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState<{
    reason: string;
    featureName?: string;
    currentLimit?: number;
  } | null>(null);

  const handleMembershipError = useCallback((error: MembershipError) => {
    setUpgradeModalData({
      reason: error.reason || error.error,
      currentLimit: error.limit,
    });
    setShowUpgradeModal(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
    setUpgradeModalData(null);
  }, []);

  /**
   * Ejecuta una llamada API y maneja automáticamente errores de membresía
   */
  const checkAndExecute = useCallback(async <T,>(
    apiCall: () => Promise<Response>,
    featureName?: string
  ): Promise<T | null> => {
    try {
      const response = await apiCall();

      if (response.status === 403) {
        const errorData = await response.json();
        if (errorData.upgradeRequired) {
          setUpgradeModalData({
            reason: errorData.reason || errorData.error,
            featureName,
            currentLimit: errorData.limit,
          });
          setShowUpgradeModal(true);
          return null;
        }
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in checkAndExecute:', error);
      throw error;
    }
  }, []);

  return {
    showUpgradeModal,
    upgradeModalData,
    handleMembershipError,
    closeUpgradeModal,
    checkAndExecute,
  };
}


