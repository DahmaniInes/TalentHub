// application-service/.../Security/RequiresPermission.java
package com.talenthub.application_service.Security;

import java.lang.annotation.*;

/**
 * Usage : @RequiresPermission("CONGE_READ")
 *         @RequiresPermission({"CONGE_READ", "CONGE_WRITE"})
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresPermission {
    String[] value();
}