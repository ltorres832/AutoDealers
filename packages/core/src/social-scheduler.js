"use strict";
// Sistema de programación automática de posts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulePost = schedulePost;
exports.publishScheduledPost = publishScheduledPost;
exports.pauseScheduledPost = pauseScheduledPost;
exports.reactivateScheduledPost = reactivateScheduledPost;
exports.getScheduledPosts = getScheduledPosts;
const shared_1 = require("@autodealers/shared");
const admin = __importStar(require("firebase-admin"));
const db = (0, shared_1.getFirestore)();
/**
 * Programa un post para publicarse más tarde
 */
async function schedulePost(post) {
    const docRef = db
        .collection('tenants')
        .doc(post.tenantId)
        .collection('scheduled_posts')
        .doc();
    const postData = {
        ...post,
        status: 'scheduled',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.set(postData);
    return {
        id: docRef.id,
        ...post,
        status: 'scheduled',
        createdAt: new Date(),
    };
}
/**
 * Publica un post programado
 */
async function publishScheduledPost(tenantId, postId) {
    try {
        const postDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('scheduled_posts')
            .doc(postId)
            .get();
        if (!postDoc.exists) {
            return { success: false, error: 'Post no encontrado' };
        }
        const post = postDoc.data();
        if (post.status !== 'scheduled') {
            return { success: false, error: 'Post no está programado' };
        }
        // Importar el servicio de publicación
        const { SocialPublisherService } = await Promise.resolve().then(() => __importStar(require('@autodealers/messaging')));
        const publisher = new SocialPublisherService();
        const results = await publisher.publishToMultiple(tenantId, {
            text: post.content.text,
            imageUrl: post.content.imageUrl,
            videoUrl: post.content.videoUrl,
            hashtags: post.content.hashtags,
        }, post.platforms);
        const postIds = {};
        let hasError = false;
        let errorMessage = '';
        results.forEach((result) => {
            if (result.success && result.postId) {
                if (result.platform === 'facebook') {
                    postIds.facebook = result.postId;
                }
                else if (result.platform === 'instagram') {
                    postIds.instagram = result.postId;
                }
            }
            else {
                hasError = true;
                errorMessage = result.error || 'Error desconocido';
            }
        });
        // Actualizar el post
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('scheduled_posts')
            .doc(postId)
            .update({
            status: hasError ? 'failed' : 'published',
            publishedAt: admin.firestore.FieldValue.serverTimestamp(),
            postIds,
            error: hasError ? errorMessage : undefined,
        });
        return { success: !hasError, error: hasError ? errorMessage : undefined };
    }
    catch (error) {
        console.error('Error publishing scheduled post:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
/**
 * Pausa un post programado
 */
async function pauseScheduledPost(tenantId, postId) {
    try {
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('scheduled_posts')
            .doc(postId)
            .update({
            status: 'cancelled',
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error pausing scheduled post:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
/**
 * Reactiva un post pausado
 */
async function reactivateScheduledPost(tenantId, postId) {
    try {
        const postDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('scheduled_posts')
            .doc(postId)
            .get();
        if (!postDoc.exists) {
            return { success: false, error: 'Post no encontrado' };
        }
        const post = postDoc.data();
        if (post.status !== 'cancelled') {
            return { success: false, error: 'Post no está pausado' };
        }
        await db
            .collection('tenants')
            .doc(tenantId)
            .collection('scheduled_posts')
            .doc(postId)
            .update({
            status: 'scheduled',
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error reactivating scheduled post:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
        };
    }
}
/**
 * Obtiene posts programados de un tenant
 */
async function getScheduledPosts(tenantId, userId, status) {
    let query = db
        .collection('tenants')
        .doc(tenantId)
        .collection('scheduled_posts');
    if (userId) {
        query = query.where('userId', '==', userId);
    }
    if (status) {
        query = query.where('status', '==', status);
    }
    const snapshot = await query.orderBy('scheduledFor', 'asc').get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledFor: data.scheduledFor?.toDate() || new Date(),
            publishedAt: data.publishedAt?.toDate(),
            createdAt: data.createdAt?.toDate() || new Date(),
        };
    });
}
