$1 == "Inst" {
  for (field = 3; field <= NF; field += 1) {
    if ($field ~ /^\(/) {
      version = $field
      sub(/^\(/, "", version)
      print $2 "=" version
      next
    }
  }

  print "APT simulation line has no candidate version: " $0 > "/dev/stderr"
  exit 2
}
