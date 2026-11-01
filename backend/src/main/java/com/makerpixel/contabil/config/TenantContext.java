package com.makerpixel.contabil.config;

import java.util.UUID;

public final class TenantContext {

    private static final ThreadLocal<UUID> currentEscritorioId = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> isAdminProduto = ThreadLocal.withInitial(() -> false);
    private static final ThreadLocal<UUID> currentUserId = new ThreadLocal<>();

    private TenantContext() {}

    public static UUID getEscritorioId() {
        return currentEscritorioId.get();
    }

    public static void setEscritorioId(UUID escritorioId) {
        currentEscritorioId.set(escritorioId);
    }

    public static boolean isAdminProduto() {
        return Boolean.TRUE.equals(isAdminProduto.get());
    }

    public static void setAdminProduto(boolean admin) {
        isAdminProduto.set(admin);
    }

    public static UUID getUserId() {
        return currentUserId.get();
    }

    public static void setUserId(UUID userId) {
        currentUserId.set(userId);
    }

    public static void clear() {
        currentEscritorioId.remove();
        isAdminProduto.remove();
        currentUserId.remove();
    }
}
