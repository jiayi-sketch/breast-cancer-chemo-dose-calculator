// SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
package org.chemodose.preview;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Arrays;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** Private, device-local encrypted history. Never stores a key beside the data. */
final class HistoryStore {
    static final int MAX_BYTES = 8 * 1024 * 1024;
    private static final Object LOCK = new Object();
    private static final String ALIAS = "ChemoDose.History.v1";
    private final AtomicFile file;
    private final File lockFile;
    static final class Snapshot {
        final String content, revision;
        Snapshot(String content, String revision) { this.content=content; this.revision=revision; }
    }
    HistoryStore(Context context) {
        File directory = new File(context.getNoBackupFilesDir(), "history");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("history");
        file = new AtomicFile(new File(directory,"history-v1.dat"));
        lockFile = new File(directory,"history.lock");
    }
    private SecretKey key(boolean existingData) throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if(store.containsAlias(ALIAS)) return (SecretKey)store.getKey(ALIAS,null);
        if(existingData) throw new IOException("missing-key");
        KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
        return generator.generateKey();
    }
    private Snapshot readUnlocked() throws Exception {
        byte[] encrypted;
        try(InputStream in=file.openRead(); ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] block=new byte[8192];int n;
            while((n=in.read(block))!=-1){if(out.size()+n>MAX_BYTES+65536)throw new IOException("size");out.write(block,0,n);}
            encrypted=out.toByteArray();
        } catch(FileNotFoundException absent){
            if(file.getBaseFile().exists() || new File(file.getBaseFile()+".bak").exists())throw absent;
            return new Snapshot("{\"schemaVersion\":1,\"autoSave\":true,\"records\":[]}","missing");
        }
        if(encrypted.length<32 || encrypted[0]!='C' || encrypted[1]!='D' || encrypted[2]!='H' || encrypted[3]!='1')throw new IOException("format");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,key(true),new GCMParameterSpec(128,Arrays.copyOfRange(encrypted,4,16)));
        byte[] plain=cipher.doFinal(encrypted,16,encrypted.length-16);
        try {
            if(plain.length>MAX_BYTES)throw new IOException("size");
            StringBuilder revision=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(encrypted))revision.append(String.format("%02x",b&255));
            return new Snapshot(new String(plain,StandardCharsets.UTF_8),revision.toString());
        } finally{Arrays.fill(plain,(byte)0);}
    }
    Snapshot read() throws Exception {
        synchronized(LOCK){try(RandomAccessFile lock=new RandomAccessFile(lockFile,"rw");java.nio.channels.FileLock ignored=lock.getChannel().lock()){return readUnlocked();}}
    }
    boolean write(String content,String expectedRevision) throws Exception {
        synchronized(LOCK){try(RandomAccessFile lock=new RandomAccessFile(lockFile,"rw");java.nio.channels.FileLock ignored=lock.getChannel().lock()){
            Snapshot current=readUnlocked();if(!current.revision.equals(expectedRevision))return false;
            byte[] plain=content.getBytes(StandardCharsets.UTF_8);if(plain.length>MAX_BYTES)throw new IOException("size");
            byte[] sealed;
            try{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(!"missing".equals(current.revision)));
                ByteArrayOutputStream out=new ByteArrayOutputStream();out.write(new byte[]{'C','D','H','1'});out.write(cipher.getIV());out.write(cipher.doFinal(plain));sealed=out.toByteArray();
            }finally{Arrays.fill(plain,(byte)0);}
            FileOutputStream stream=null;
            try{stream=file.startWrite();stream.write(sealed);file.finishWrite(stream);}
            catch(Exception error){if(stream!=null)file.failWrite(stream);throw error;}
            return true;
        }}
    }
}
